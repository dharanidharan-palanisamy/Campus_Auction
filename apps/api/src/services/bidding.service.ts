import mongoose from 'mongoose';
import {
  AuctionListing,
  Bid,
  AutoBidLimit,
  AuctionOutcome,
  Notification,
  AuctionEvent,
  IdempotencyRecord,
  OutboxEvent,
} from '../models';
import { emitAuctionUpdate, emitUserNotification, emitAdminEvent } from '../lib/socket';

export interface PlaceBidInput {
  listingId: string;
  bidderId: string;
  amountInCents: number;
  idempotencyKey?: string;
  bidType?: 'MANUAL' | 'AUTO_PROXY' | 'AI_CONFIRMED';
}

export interface BidResult {
  success: boolean;
  message?: string;
  bid?: any;
  listing?: any;
  extended?: boolean;
  newClosingTime?: Date;
}

export class BiddingService {
  /**
   * Authoritative transaction-safe bid placement with MongoDB concurrency protection.
   * Enforces:
   * 1. Idempotency validation
   * 2. Bidder is not seller
   * 3. Listing is ACTIVE and not expired
   * 4. Safe monetary precision (integer cents)
   * 5. First bid >= startingPrice, subsequent bids >= currentLeadingBid + minIncrement
   * 6. Anti-sniping extension (bids in last 30s extend deadline by 60s)
   * 7. Atomic version check and update to prevent concurrent race conditions
   * 8. Outbid notifications and telemetry events
   * 9. Automatic proxy counter-bidding
   */
  static async placeBid(input: PlaceBidInput): Promise<BidResult> {
    const { listingId, bidderId, amountInCents, idempotencyKey, bidType = 'MANUAL' } = input;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingBid = await Bid.findOne({ idempotencyKey }).populate({
        path: 'bidder',
        select: 'campusAlias',
      });

      if (existingBid) {
        const listing = await AuctionListing.findById(listingId);
        return {
          success: true,
          message: 'Bid already recorded (idempotent)',
          bid: existingBid.toJSON(),
          listing: listing ? listing.toJSON() : null,
        };
      }
    }

    // Try executing within a session/transaction if replica set is enabled,
    // otherwise fallback gracefully to atomic conditional update with optimistic versioning.
    let session: mongoose.ClientSession | null = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      session = null;
      useTransaction = false;
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const result = await BiddingService.executeBidPlacement({
          listingId,
          bidderId,
          amountInCents,
          idempotencyKey,
          bidType,
          session: useTransaction ? session : null,
        });

        if (useTransaction && session && session.inTransaction()) {
          await session.commitTransaction();
        }

        // Post-commit async triggers: proxy bidding evaluation
        BiddingService.evaluateAutoBids(listingId, bidderId, amountInCents).catch((err) => {
          console.error('[AutoBid] Error during auto-bid trigger:', err);
        });

        return result;
      } catch (error: any) {
        if (useTransaction && session && session.inTransaction()) {
          await session.abortTransaction();
        }

        // Check if write conflict error or version mismatch (transient concurrency conflict)
        const isConflict =
          error?.code === 112 ||
          error?.errorLabels?.includes('TransientTransactionError') ||
          error?.message?.includes('WriteConflict') ||
          error?.message?.includes('Version conflict');

        if (isConflict && attempt < maxRetries) {
          // Jittered backoff retry
          await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 50));
          if (useTransaction && session) {
            session.startTransaction();
          }
          continue;
        }

        throw error;
      } finally {
        if (attempt >= maxRetries || !useTransaction) {
          if (session) {
            await session.endSession();
          }
        }
      }
    }

    if (session) {
      await session.endSession();
    }
    throw new Error('Failed to place bid due to high concurrency. Please try again.');
  }

  private static async executeBidPlacement({
    listingId,
    bidderId,
    amountInCents,
    idempotencyKey,
    bidType,
    session,
  }: {
    listingId: string;
    bidderId: string;
    amountInCents: number;
    idempotencyKey?: string;
    bidType: 'MANUAL' | 'AUTO_PROXY' | 'AI_CONFIRMED';
    session: mongoose.ClientSession | null;
  }): Promise<BidResult> {
    const opts = session ? { session } : {};

    // 1. Fetch current authoritative listing state
    const listing = await AuctionListing.findById(listingId, null, opts);
    if (!listing) {
      throw new Error('Auction listing not found');
    }

    if (listing.sellerId.toString() === bidderId) {
      throw new Error('Sellers cannot place bids on their own listings');
    }

    if (listing.status !== 'ACTIVE') {
      throw new Error(`Auction is not currently active (status: ${listing.status})`);
    }

    const now = new Date();
    if (now > listing.closingTime) {
      throw new Error('Auction has already closed');
    }

    // 2. Validate Bid Amount
    const currentHighest = listing.currentLeadingBidInCents;
    let minAcceptable = 0;

    if (currentHighest === 0) {
      minAcceptable = listing.startingPriceInCents;
    } else {
      minAcceptable = currentHighest + listing.minIncrementInCents;
    }

    if (amountInCents < minAcceptable) {
      throw new Error(
        `Bid ₹${(amountInCents / 100).toFixed(2)} is lower than the required minimum acceptable bid of ₹${(minAcceptable / 100).toFixed(2)}`
      );
    }

    // Previous leading bid and bidder for OUTBID notification
    const previousLeadingBid = listing.leadingBidId
      ? await Bid.findById(listing.leadingBidId, null, opts)
      : null;
    const previousLeaderId = previousLeadingBid ? previousLeadingBid.bidderId.toString() : null;

    // 3. Create Bid
    const bidDocs = await Bid.create(
      [
        {
          listingId: listing._id,
          bidderId: new mongoose.Types.ObjectId(bidderId),
          amountInCents,
          bidType,
          idempotencyKey,
          acceptedAt: now,
        },
      ],
      opts
    );
    const bid = bidDocs[0];
    await bid.populate({ path: 'bidder', select: 'id campusAlias' });

    // 4. Anti-Sniping Rule:
    // If a valid bid arrives within the final 30 seconds, extend closingTime to 60s from now.
    const msRemaining = listing.closingTime.getTime() - now.getTime();
    let extended = false;
    let newClosingTime = listing.closingTime;

    if (msRemaining <= 30 * 1000) {
      extended = true;
      newClosingTime = new Date(now.getTime() + 60 * 1000);
    }

    // 5. Atomic conditional update with version locking
    const currentVersion = listing.version;
    const updatedListing = await AuctionListing.findOneAndUpdate(
      { _id: listing._id, version: currentVersion },
      {
        $set: {
          currentLeadingBidInCents: amountInCents,
          leadingBidId: bid._id,
          closingTime: newClosingTime,
        },
        $inc: { version: 1 },
      },
      { new: true, ...opts }
    );

    if (!updatedListing) {
      throw new Error('Version conflict: another bid was processed concurrently. Retrying...');
    }

    // 6. Record Outbid Notification if someone was displaced
    if (previousLeaderId && previousLeaderId !== bidderId) {
      const notifDocs = await Notification.create(
        [
          {
            userId: new mongoose.Types.ObjectId(previousLeaderId),
            type: 'OUTBID',
            title: `You were outbid on ${listing.title}`,
            message: `A new bid of ₹${(amountInCents / 100).toFixed(2)} has taken the lead.`,
            metadata: { listingId, currentBid: amountInCents },
          },
        ],
        opts
      );
      emitUserNotification(previousLeaderId, notifDocs[0].toJSON());
    }

    // 7. Log Auction Event & Outbox Event
    await AuctionEvent.create(
      [
        {
          listingId: listing._id,
          actorId: new mongoose.Types.ObjectId(bidderId),
          eventType: 'BID_ACCEPTED',
          payload: {
            bidId: bid._id.toString(),
            bidderAlias: (bid as any).bidder?.campusAlias,
            amountInCents,
            extended,
            newClosingTime,
          },
        },
      ],
      opts
    );

    await OutboxEvent.create(
      [
        {
          eventType: 'auction:bid-accepted',
          aggregateId: listingId,
          payload: {
            listingId,
            bidId: bid._id.toString(),
            amountInCents,
          },
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      ],
      opts
    );

    if (idempotencyKey) {
      await IdempotencyRecord.create(
        [
          {
            userId: new mongoose.Types.ObjectId(bidderId),
            key: idempotencyKey,
            response: { bidId: bid._id.toString(), amountInCents },
            status: 'COMPLETED',
          },
        ],
        opts
      );
    }

    // 8. Broadcast Real-Time updates
    const bidPayload = {
      id: bid._id.toString(),
      amountInCents: bid.amountInCents,
      campusAlias: (bid as any).bidder?.campusAlias || 'Student',
      acceptedAt: bid.acceptedAt,
      bidType: bid.bidType,
    };

    emitAuctionUpdate(listingId, 'auction:bid-accepted', {
      listingId,
      bid: bidPayload,
      currentLeadingBidInCents: amountInCents,
      extended,
      newClosingTime,
    });

    emitAdminEvent('bid:placed', {
      listingId,
      listingTitle: listing.title,
      bid: {
        ...bidPayload,
        bidderId: bid.bidderId.toString(),
      },
      currentLeadingBidInCents: amountInCents,
      extended,
      newClosingTime,
    });

    return {
      success: true,
      bid: bid.toJSON(),
      listing: updatedListing.toJSON(),
      extended,
      newClosingTime,
    };
  }

  /**
   * Automatic proxy bidding evaluator.
   * Compares active AutoBidLimits and automatically submits counter-bids.
   */
  static async evaluateAutoBids(
    listingId: string,
    currentLeaderId: string,
    currentLeadingAmount: number
  ): Promise<void> {
    try {
      const listing = await AuctionListing.findById(listingId);
      if (!listing || listing.status !== 'ACTIVE' || new Date() > listing.closingTime) {
        return;
      }

      const minNext = currentLeadingAmount + listing.minIncrementInCents;

      // Find highest active auto bid from a competitor whose max limit is >= minNext
      const topAutoLimit = await AutoBidLimit.findOne({
        listingId: listing._id,
        bidderId: { $ne: new mongoose.Types.ObjectId(currentLeaderId) },
        isActive: true,
        maxLimitInCents: { $gte: minNext },
      }).sort({ maxLimitInCents: -1, createdAt: 1 });

      if (topAutoLimit) {
        // Automatically place proxy bid
        await BiddingService.placeBid({
          listingId,
          bidderId: topAutoLimit.bidderId.toString(),
          amountInCents: minNext,
          bidType: 'AUTO_PROXY',
        });
      }
    } catch (error) {
      console.warn('[AutoBid] Evaluation completed with notice:', error);
    }
  }

  /**
   * Authoritative auction closure evaluation.
   */
  static async evaluateClosing(listingId: string): Promise<any> {
    const listing = await AuctionListing.findById(listingId).populate('seller');
    if (!listing || listing.status !== 'ACTIVE') return null;

    const now = new Date();
    if (now < listing.closingTime) return null; // Not closed yet

    const winningBid = await Bid.findOne({ listingId: listing._id })
      .sort({ amountInCents: -1, acceptedAt: 1 })
      .populate('bidder');

    if (!winningBid) {
      // No bids placed -> UNSOLD
      listing.status = 'UNSOLD';
      await listing.save();

      const notif = await Notification.create({
        userId: listing.sellerId,
        type: 'SELLER_DECISION',
        title: `Auction Unsold: ${listing.title}`,
        message: 'Your auction closed with no bids placed.',
        metadata: { listingId },
      });

      emitUserNotification(listing.sellerId.toString(), notif.toJSON());
      emitAuctionUpdate(listingId, 'auction:status-changed', { status: 'UNSOLD' });
      return listing.toJSON();
    }

    // Winning bid exists -> PENDING_SELLER_DECISION
    listing.status = 'PENDING_SELLER_DECISION';
    await listing.save();

    // Create or update Auction Outcome
    await AuctionOutcome.findOneAndUpdate(
      { listingId: listing._id },
      {
        listingId: listing._id,
        winnerId: winningBid.bidderId,
        finalAmountInCents: winningBid.amountInCents,
        sellerDecision: 'PENDING',
      },
      { upsert: true, new: true }
    );

    // Notify Seller
    const sellerNotif = await Notification.create({
      userId: listing.sellerId,
      type: 'SELLER_DECISION',
      title: `Action Required: Review Winning Bid for ${listing.title}`,
      message: `Winning bid of ₹${(winningBid.amountInCents / 100).toFixed(2)} received from ${(winningBid as any).bidder?.campusAlias || 'Student'}. Please approve or reject.`,
      metadata: { listingId, winnerId: winningBid.bidderId.toString(), amount: winningBid.amountInCents },
    });
    emitUserNotification(listing.sellerId.toString(), sellerNotif.toJSON());

    // Notify Winner
    const winnerNotif = await Notification.create({
      userId: winningBid.bidderId,
      type: 'PROVISIONAL_WIN',
      title: `Congratulations! You are the provisional winner of ${listing.title}`,
      message: `Your bid of ₹${(winningBid.amountInCents / 100).toFixed(2)} won the auction. Awaiting seller confirmation.`,
      metadata: { listingId, amount: winningBid.amountInCents },
    });
    emitUserNotification(winningBid.bidderId.toString(), winnerNotif.toJSON());

    emitAuctionUpdate(listingId, 'auction:status-changed', { status: 'PENDING_SELLER_DECISION' });
    return listing.toJSON();
  }
}
