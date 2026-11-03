import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, Category, AuctionListing, HandoverRecord, SellerReview, PickupAppointment, Bid } from '../models';
import { TrustService } from '../services/trust.service';
import { HandoverService } from '../services/handover.service';
import { PricingEstimatorService } from '../services/pricing-estimator.service';
import { AppointmentService } from '../services/appointment.service';
import { IntelligenceService } from '../services/intelligence.service';

describe('Production Features Test Suite', () => {
  let seller: any;
  let buyer: any;
  let category: any;
  let listing: any;

  beforeAll(async () => {
    await connectDatabase();
    const timestamp = Date.now();

    category = await Category.create({
      name: `Category_${timestamp}`,
      slug: `category_${timestamp}`,
      description: 'Test category',
    });

    seller = await User.create({
      email: `seller_${timestamp}@university.edu`,
      passwordHash: 'dummy_hash',
      fullName: 'Reputable Seller',
      campusAlias: `Seller_${timestamp}`,
      role: 'STUDENT',
      verificationStatus: 'VERIFIED',
    });

    buyer = await User.create({
      email: `buyer_${timestamp}@university.edu`,
      passwordHash: 'dummy_hash',
      fullName: 'Active Buyer',
      campusAlias: `Buyer_${timestamp}`,
      role: 'STUDENT',
      verificationStatus: 'VERIFIED',
    });

    listing = await AuctionListing.create({
      sellerId: seller._id,
      categoryId: category._id,
      title: 'Graphing Calculator Casio fx-991EX',
      description: 'Barely used calculator with slip cover for electrical engineering classes.',
      condition: 'LIKE_NEW',
      startingPriceInCents: 50000,
      minIncrementInCents: 5000,
      currentLeadingBidInCents: 85000,
      status: 'COMPLETED',
      closingTime: new Date(Date.now() - 3600000),
      pickupLocation: 'Main Campus Library Lobby',
    });

    const winningBid = await Bid.create({
      listingId: listing._id,
      bidderId: buyer._id,
      amountInCents: 85000,
      bidType: 'MANUAL',
      acceptedAt: new Date(),
    });
    listing.leadingBidId = winningBid._id;
    await listing.save();
  }, 30000);

  afterAll(async () => {
    if (seller?._id) await User.deleteMany({ _id: { $in: [seller._id, buyer._id] } });
    if (category?._id) await Category.deleteOne({ _id: category._id });
    if (listing?._id) {
      await AuctionListing.deleteOne({ _id: listing._id });
      await Bid.deleteMany({ listingId: listing._id });
      await HandoverRecord.deleteMany({ listingId: listing._id });
      await SellerReview.deleteMany({ listingId: listing._id });
      await PickupAppointment.deleteMany({ listingId: listing._id });
    }
    await disconnectDatabase();
  }, 30000);

  // 1. Campus Trust Score
  it('Feature 1: Calculates seller trust score and tier correctly', async () => {
    const trustResult = await TrustService.calculateAndSaveTrustScore(seller._id);
    expect(trustResult.trustScore).toBeGreaterThanOrEqual(50);
    expect(['NEWBIE', 'RISING', 'TRUSTED', 'ELITE']).toContain(trustResult.trustTier);

    const profile = await TrustService.getUserTrustProfile(seller._id);
    expect(profile.user.id).toBe(seller._id.toString());
    expect(profile.reputation.score).toBe(trustResult.trustScore);
  }, 15000);

  // 2. QR Verified Campus Handover
  it('Feature 2: Issues QR code pass and verifies handover successfully', async () => {
    const pass = await HandoverService.getOrCreateHandoverPass(listing._id.toString(), seller._id.toString());
    expect(pass.qrDataUrl).toContain('data:image/png;base64');
    expect(pass.handoverCode).toHaveLength(6);
    expect(pass.isCompleted).toBe(false);

    // Verify using the 6-digit backup code
    const verifyResult = await HandoverService.verifyHandover({
      listingId: listing._id.toString(),
      actorUserId: buyer._id.toString(),
      code: pass.handoverCode,
    });
    expect(verifyResult.success).toBe(true);

    // Ensure duplicate verification is prevented
    const secondAttempt = await HandoverService.verifyHandover({
      listingId: listing._id.toString(),
      actorUserId: buyer._id.toString(),
      code: pass.handoverCode,
    });
    expect(secondAttempt.alreadyCompleted).toBe(true);
  }, 15000);

  // 3. AI Smart Price Estimator
  it('Feature 3: Estimates fair campus resale price and recommended starting price', async () => {
    const estimate = await PricingEstimatorService.estimatePrice({
      title: 'Bicycle 26T Mountain Bike',
      categoryId: category._id.toString(),
      condition: 'GOOD',
      description: 'Used for one semester around campus.',
    });

    expect(estimate.estimatedResalePrice.median).toBeGreaterThan(0);
    expect(estimate.recommendedStartingPrice).toBeGreaterThan(0);
    expect(estimate.recommendedMinIncrement).toBeGreaterThanOrEqual(20);
    expect(['HIGH', 'MEDIUM', 'MODERATE']).toContain(estimate.demandLevel);
    expect(estimate.confidenceScore).toBeGreaterThan(50);
  }, 15000);

  // 4. Campus Pickup Appointments
  it('Feature 4: Books and retrieves designated campus pickup appointment', async () => {
    const slots = AppointmentService.getAvailableSlots();
    expect(slots.length).toBeGreaterThan(0);

    const appointment = await AppointmentService.bookAppointment({
      listingId: listing._id.toString(),
      userId: buyer._id.toString(),
      slotTime: slots[0].slotTime,
      locationName: 'Main Campus Library Lobby',
      notes: 'I will be wearing a blue university hoodie.',
    });

    expect(appointment._id).toBeDefined();
    expect(appointment.status).toBe('CONFIRMED');

    const listingAppointments = await AppointmentService.getListingAppointments(listing._id.toString(), buyer._id.toString());
    expect(listingAppointments.appointments.length).toBeGreaterThanOrEqual(1);
    expect(listingAppointments.safeLocations.length).toBeGreaterThan(0);
  }, 15000);

  // 5. Auction Price Intelligence
  it('Feature 5: Aggregates market overview KPIs and category pricing intelligence', async () => {
    const overview = await IntelligenceService.getMarketOverview();
    expect(overview.kpis.totalAuctions).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(overview.categoryStats)).toBe(true);
    expect(Array.isArray(overview.priceTrends)).toBe(true);
  }, 15000);
});
