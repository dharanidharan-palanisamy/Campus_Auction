import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, Category, AuctionListing, Bid } from '../models';
import { BiddingService } from '../services/bidding.service';

describe('Core Bidding Engine & Rules (MongoDB / Mongoose)', () => {
  let seller: any;
  let bidder1: any;
  let bidder2: any;
  let listing: any;

  beforeAll(async () => {
    await connectDatabase();

    // Ensure a test category exists
    let category = await Category.findOne({ slug: 'test-category' });
    if (!category) {
      category = await Category.create({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category description',
      });
    }

    const timestamp = Date.now();

    seller = await User.create({
      email: `seller_${timestamp}@campus.edu`,
      passwordHash: 'hash',
      fullName: 'Test Seller',
      campusAlias: 'SellerUser',
      studentId: `ID_${timestamp}_1`,
      role: 'STUDENT',
    });

    bidder1 = await User.create({
      email: `bidder1_${timestamp}@campus.edu`,
      passwordHash: 'hash',
      fullName: 'Bidder One',
      campusAlias: 'Bidder1',
      studentId: `ID_${timestamp}_2`,
      role: 'STUDENT',
    });

    bidder2 = await User.create({
      email: `bidder2_${timestamp}@campus.edu`,
      passwordHash: 'hash',
      fullName: 'Bidder Two',
      campusAlias: 'Bidder2',
      studentId: `ID_${timestamp}_3`,
      role: 'STUDENT',
    });

    // Create test listing: Start price ₹1000 (100000 cents), increment ₹100 (10000 cents)
    listing = await AuctionListing.create({
      sellerId: seller._id,
      categoryId: category._id,
      title: 'Test Engineering Drafter',
      description: 'Test description for bidding engine test',
      condition: 'GOOD',
      startingPriceInCents: 100000,
      minIncrementInCents: 10000,
      currentLeadingBidInCents: 0,
      status: 'ACTIVE',
      startTime: new Date(),
      closingTime: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      pickupLocation: 'Campus Gate',
    });
  });

  afterAll(async () => {
    // Cleanup test fixtures
    if (listing) {
      await Bid.deleteMany({ listingId: listing._id });
      await AuctionListing.findByIdAndDelete(listing._id);
    }
    if (seller) await User.findByIdAndDelete(seller._id);
    if (bidder1) await User.findByIdAndDelete(bidder1._id);
    if (bidder2) await User.findByIdAndDelete(bidder2._id);
    await disconnectDatabase();
  });

  it('Rule: Seller cannot bid on own listing', async () => {
    await expect(
      BiddingService.placeBid({
        listingId: listing._id.toString(),
        bidderId: seller._id.toString(),
        amountInCents: 100000,
      })
    ).rejects.toThrow('Sellers cannot place bids on their own listings');
  });

  it('Rule: First bid must be at least the starting price', async () => {
    await expect(
      BiddingService.placeBid({
        listingId: listing._id.toString(),
        bidderId: bidder1._id.toString(),
        amountInCents: 90000, // Below starting price
      })
    ).rejects.toThrow('lower than the required minimum acceptable bid');
  });

  it('Rule: Valid first bid accepted', async () => {
    const res = await BiddingService.placeBid({
      listingId: listing._id.toString(),
      bidderId: bidder1._id.toString(),
      amountInCents: 100000, // Exact starting price
    });

    expect(res.success).toBe(true);
    expect(res.bid.amountInCents).toBe(100000);
    expect(res.listing.currentLeadingBidInCents).toBe(100000);
  });

  it('Rule: Subsequent bid must satisfy minimum increment', async () => {
    // Current lead is 100000. Increment is 10000. 105000 should be rejected.
    await expect(
      BiddingService.placeBid({
        listingId: listing._id.toString(),
        bidderId: bidder2._id.toString(),
        amountInCents: 105000,
      })
    ).rejects.toThrow('lower than the required minimum acceptable bid');

    // 110000 should succeed
    const res = await BiddingService.placeBid({
      listingId: listing._id.toString(),
      bidderId: bidder2._id.toString(),
      amountInCents: 110000,
    });
    expect(res.success).toBe(true);
    expect(res.bid.amountInCents).toBe(110000);
  });

  it('Rule: Anti-sniping extension triggers in final 30 seconds', async () => {
    // Update listing closing time to 15 seconds from now
    const nearClosing = new Date(Date.now() + 15 * 1000);
    await AuctionListing.findByIdAndUpdate(listing._id, { closingTime: nearClosing });

    const res = await BiddingService.placeBid({
      listingId: listing._id.toString(),
      bidderId: bidder1._id.toString(),
      amountInCents: 120000,
    });

    expect(res.extended).toBe(true);
    expect(res.newClosingTime!.getTime()).toBeGreaterThan(Date.now() + 45 * 1000);
  });
});
