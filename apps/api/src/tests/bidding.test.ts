import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';
import { BiddingService } from '../services/bidding.service';

describe('Core Bidding Engine & Rules', () => {
  let seller: any;
  let bidder1: any;
  let bidder2: any;
  let listing: any;

  beforeAll(async () => {
    // Setup test users
    seller = await prisma.user.create({
      data: {
        email: `seller_${Date.now()}@campus.edu`,
        passwordHash: 'hash',
        fullName: 'Test Seller',
        campusAlias: 'SellerUser',
        studentId: `ID_${Date.now()}_1`,
        role: 'STUDENT',
      },
    });

    bidder1 = await prisma.user.create({
      data: {
        email: `bidder1_${Date.now()}@campus.edu`,
        passwordHash: 'hash',
        fullName: 'Bidder One',
        campusAlias: 'Bidder1',
        studentId: `ID_${Date.now()}_2`,
        role: 'STUDENT',
      },
    });

    bidder2 = await prisma.user.create({
      data: {
        email: `bidder2_${Date.now()}@campus.edu`,
        passwordHash: 'hash',
        fullName: 'Bidder Two',
        campusAlias: 'Bidder2',
        studentId: `ID_${Date.now()}_3`,
        role: 'STUDENT',
      },
    });

    const category = await prisma.category.findFirst();

    // Create test listing: Start price ₹1000 (100000 cents), increment ₹100 (10000 cents)
    listing = await prisma.auctionListing.create({
      data: {
        sellerId: seller.id,
        categoryId: category!.id,
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
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Rule: Seller cannot bid on own listing', async () => {
    await expect(
      BiddingService.placeBid({
        listingId: listing.id,
        bidderId: seller.id,
        amountInCents: 100000,
      })
    ).rejects.toThrow('Sellers cannot place bids on their own listings');
  });

  it('Rule: First bid must be at least the starting price', async () => {
    await expect(
      BiddingService.placeBid({
        listingId: listing.id,
        bidderId: bidder1.id,
        amountInCents: 90000, // Below starting price
      })
    ).rejects.toThrow('lower than the required minimum acceptable bid');
  });

  it('Rule: Valid first bid accepted', async () => {
    const res = await BiddingService.placeBid({
      listingId: listing.id,
      bidderId: bidder1.id,
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
        listingId: listing.id,
        bidderId: bidder2.id,
        amountInCents: 105000,
      })
    ).rejects.toThrow('lower than the required minimum acceptable bid');

    // 110000 should succeed
    const res = await BiddingService.placeBid({
      listingId: listing.id,
      bidderId: bidder2.id,
      amountInCents: 110000,
    });
    expect(res.success).toBe(true);
    expect(res.bid.amountInCents).toBe(110000);
  });

  it('Rule: Anti-sniping extension triggers in final 30 seconds', async () => {
    // Update listing closing time to 15 seconds from now
    const nearClosing = new Date(Date.now() + 15 * 1000);
    await prisma.auctionListing.update({
      where: { id: listing.id },
      data: { closingTime: nearClosing },
    });

    const res = await BiddingService.placeBid({
      listingId: listing.id,
      bidderId: bidder1.id,
      amountInCents: 120000,
    });

    expect(res.extended).toBe(true);
    expect(res.newClosingTime!.getTime()).toBeGreaterThan(Date.now() + 45 * 1000);
  });
});
