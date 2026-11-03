import mongoose from 'mongoose';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { HandoverRecord, AuctionListing, User, AuditLog, OutboxEvent, Bid, AuctionOutcome } from '../models';
import { TrustService } from './trust.service';
import { emitAdminEvent } from '../lib/socket';

export class HandoverService {
  /**
   * Helper to retrieve buyer ID for a listing
   */
  private static async getBuyerId(listing: any): Promise<string | null> {
    if (listing.leadingBidId) {
      const leadingBid = await Bid.findById(listing.leadingBidId);
      if (leadingBid) return leadingBid.bidderId.toString();
    }
    const outcome = await AuctionOutcome.findOne({ listingId: listing._id });
    if (outcome && outcome.winnerId) return outcome.winnerId.toString();
    return null;
  }

  /**
   * Generates or retrieves the secure one-time QR code and 6-digit backup code for an auction handover.
   * Only accessible to the winning buyer or the seller.
   */
  static async getOrCreateHandoverPass(listingId: string, requestUserId: string) {
    const listing = await AuctionListing.findById(listingId);
    if (!listing) throw new Error('Auction listing not found');

    const sellerIdStr = listing.sellerId.toString();
    const buyerIdStr = await HandoverService.getBuyerId(listing);

    if (requestUserId !== sellerIdStr && requestUserId !== buyerIdStr) {
      throw new Error('Unauthorized: Only the verified buyer or seller can view this handover pass.');
    }

    if (listing.status === 'ACTIVE' || listing.status === 'DRAFT' || listing.status === 'SCHEDULED') {
      // If still active, cannot generate handover pass yet
      throw new Error('Handover passes are only issued once the auction has successfully concluded.');
    }

    let record = await HandoverRecord.findOne({ listingId: listing._id });

    // Generate new secure tokens if not existing or expired
    const now = new Date();
    const tokenNeedsGeneration =
      !record ||
      !record.qrCodeToken ||
      !record.handoverCode ||
      (record.qrExpiresAt && record.qrExpiresAt < now && record.handoverStatus === 'PENDING');

    if (!record) {
      const qrCodeToken = crypto.randomBytes(24).toString('hex');
      const handoverCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      const qrExpiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours validity

      record = await HandoverRecord.create({
        listingId: listing._id,
        sellerId: listing.sellerId,
        buyerId: buyerIdStr ? new mongoose.Types.ObjectId(buyerIdStr) : undefined,
        handoverStatus: 'PENDING',
        qrCodeToken,
        handoverCode,
        qrExpiresAt,
        location: listing.pickupLocation || 'Designated Campus Meeting Spot',
      });
    } else if (tokenNeedsGeneration) {
      record.qrCodeToken = crypto.randomBytes(24).toString('hex');
      record.handoverCode = Math.floor(100000 + Math.random() * 900000).toString();
      record.qrExpiresAt = new Date(Date.now() + 72 * 3600 * 1000);
      await record.save();
    }

    // Payload embedded inside the QR Code
    const qrPayload = JSON.stringify({
      type: 'CAMPUSBID_HANDOVER',
      listingId: listing._id.toString(),
      token: record.qrCodeToken,
      expiresAt: record.qrExpiresAt?.toISOString(),
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#4f46e5', // indigo-600
        light: '#ffffff',
      },
    });

    return {
      listingId: listing._id.toString(),
      title: listing.title,
      status: record.handoverStatus,
      qrDataUrl,
      handoverCode: record.handoverCode,
      qrExpiresAt: record.qrExpiresAt,
      location: record.location || listing.pickupLocation,
      isCompleted: record.handoverStatus === 'COMPLETED',
      completedAt: record.completedAt,
      isBuyer: requestUserId === buyerIdStr,
      isSeller: requestUserId === sellerIdStr,
    };
  }

  /**
   * Verifies the QR code token or 6-digit backup code upon physical campus meeting.
   * Can be initiated by either party scanning/entering the other's pass.
   */
  static async verifyHandover(params: {
    listingId: string;
    actorUserId: string;
    token?: string;
    code?: string;
    notes?: string;
  }) {
    const { listingId, actorUserId, token, code, notes } = params;

    const listing = await AuctionListing.findById(listingId);
    if (!listing) throw new Error('Auction listing not found');

    const record = await HandoverRecord.findOne({ listingId: listing._id });
    if (!record) throw new Error('Handover record not found for this auction');

    // 1. Prevent duplicate confirmation
    if (record.handoverStatus === 'COMPLETED') {
      return {
        alreadyCompleted: true,
        message: 'This handover has already been verified and completed.',
        completedAt: record.completedAt,
      };
    }

    // 2. Validate participant authorization
    const sellerIdStr = (record.sellerId || listing.sellerId).toString();
    const buyerIdStr = record.buyerId?.toString() || (await HandoverService.getBuyerId(listing));

    if (actorUserId !== sellerIdStr && actorUserId !== buyerIdStr) {
      throw new Error('Unauthorized: Only the registered seller or winning buyer can verify this handover.');
    }

    // 3. Expiration check
    if (record.qrExpiresAt && record.qrExpiresAt < new Date()) {
      throw new Error('Handover pass has expired. Please refresh the handover pass on your dashboard.');
    }

    // 4. Token or code validation
    let isValid = false;
    let method: 'QR_SCAN' | 'MANUAL_CODE' = 'QR_SCAN';

    if (token && record.qrCodeToken === token.trim()) {
      isValid = true;
      method = 'QR_SCAN';
    } else if (code && record.handoverCode === code.trim()) {
      isValid = true;
      method = 'MANUAL_CODE';
    }

    if (!isValid) {
      throw new Error('Invalid QR Code or 6-digit backup PIN. Verification rejected.');
    }

    // 5. Complete handover atomically
    record.handoverStatus = 'COMPLETED';
    record.completedAt = new Date();
    record.scannedAt = new Date();
    record.scannedBy = new mongoose.Types.ObjectId(actorUserId);
    record.verificationMethod = method;
    if (notes) record.pickupNotes = notes;
    await record.save();

    // 6. Update listing status to COMPLETED
    listing.status = 'COMPLETED';
    await listing.save();

    // 7. Increment seller successful handover count and update trust score
    await TrustService.calculateAndSaveTrustScore(sellerIdStr);

    // 8. Record audit log
    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(actorUserId),
      action: 'VERIFIED_HANDOVER',
      entityType: 'AuctionListing',
      entityId: listing._id.toString(),
      reason: `Campus handover completed via ${method}`,
      newValues: {
        completedAt: record.completedAt,
        method,
      },
    });

    // 9. Create outbox event and emit real-time event
    await OutboxEvent.create({
      eventType: 'HANDOVER_VERIFIED',
      aggregateId: listing._id.toString(),
      payload: {
        listingId: listing._id.toString(),
        completedAt: record.completedAt,
        method,
      },
      status: 'PENDING',
    });

    emitAdminEvent('HANDOVER_COMPLETED', {
      listingId: listing._id.toString(),
      title: listing.title,
      completedAt: record.completedAt,
      method,
    });

    return {
      success: true,
      message: 'Campus handover verified successfully!',
      completedAt: record.completedAt,
      verificationMethod: method,
    };
  }
}
