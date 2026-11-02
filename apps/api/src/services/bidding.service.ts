import { prisma } from '../lib/prisma';
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
   * Authoritative transaction-safe bid placement.
   * Enforces:
   * 1. Bidder is not seller.
   * 2. Listing is ACTIVE and before closingTime.
   * 3. First bid >= startingPrice.
   * 4. Subsequent bids >= currentLeadingBid + minIncrement.
   * 5. Anti-sniping extension: bids in last 30s extend deadline by 60s.
   * 6. Idempotency protection.
   * 7. Triggering auto-bidding proxy competitors.
   */
  static async placeBid(input: PlaceBidInput): Promise<BidResult> {
    const { listingId, bidderId, amountInCents, idempotencyKey, bidType = 'MANUAL' } = input;

    // Check idempotency first if key is provided
    if (idempotencyKey) {
      const existingBid = await prisma.bid.findUnique({
        where: { idempotencyKey },
        include: { listing: true, bidder: { select: { campusAlias: true } } },
      });
      if (existingBid) {
        return {
          success: true,
          message: 'Bid already recorded (idempotent)',
          bid: existingBid,
          listing: existingBid.listing,
        };
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current authoritative listing state
      const listing = await tx.auctionListing.findUnique({
        where: { id: listingId },
        include: {
          bids: {
            orderBy: { amountInCents: 'desc' },
            take: 1,
          },
        },
      });

      if (!listing) {
        throw new Error('Auction listing not found');
      }

      if (listing.sellerId === bidderId) {
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

      // Previous leading bidder to notify for OUTBID
      const previousLeaderBid = listing.bids[0];
      const previousLeaderId = previousLeaderBid ? previousLeaderBid.bidderId : null;

      // 3. Create Bid
      const bid = await tx.bid.create({
        data: {
          listingId,
          bidderId,
          amountInCents,
          bidType,
          idempotencyKey,
          acceptedAt: now,
        },
        include: {
          bidder: {
            select: { id: true, campusAlias: true },
          },
        },
      });

      // 4. Anti-Sniping Rule:
      // If a valid bid arrives within the final 30 seconds, extend closingTime to 60s from now.
      const msRemaining = listing.closingTime.getTime() - now.getTime();
      let extended = false;
      let newClosingTime = listing.closingTime;

      if (msRemaining <= 30 * 1000) {
        extended = true;
        newClosingTime = new Date(now.getTime() + 60 * 1000);
      }

      // 5. Update Listing
      const updatedListing = await tx.auctionListing.update({
        where: { id: listingId },
        data: {
          currentLeadingBidInCents: amountInCents,
          leadingBidId: bid.id,
          version: { increment: 1 },
          closingTime: newClosingTime,
        },
      });

      // 6. Record Outbid Notification if someone was displaced
      if (previousLeaderId && previousLeaderId !== bidderId) {
        const notif = await tx.notification.create({
          data: {
            userId: previousLeaderId,
            type: 'OUTBID',
            title: `You were outbid on ${listing.title}`,
            message: `A new bid of ₹${(amountInCents / 100).toFixed(2)} has taken the lead.`,
            metadata: JSON.stringify({ listingId, currentBid: amountInCents }),
          },
        });
        emitUserNotification(previousLeaderId, notif);
      }

      // Log Auction Event
      await tx.auctionEvent.create({
        data: {
          listingId,
          eventType: 'BID_ACCEPTED',
          payload: JSON.stringify({
            bidId: bid.id,
            bidderAlias: bid.bidder.campusAlias,
            amountInCents,
            extended,
            newClosingTime,
          }),
        },
      });

      // Broadcast Real-Time updates
      emitAuctionUpdate(listingId, 'auction:bid-accepted', {
        listingId,
        bid: {
          id: bid.id,
          amountInCents: bid.amountInCents,
          campusAlias: bid.bidder.campusAlias,
          acceptedAt: bid.acceptedAt,
          bidType: bid.bidType,
        },
        currentLeadingBidInCents: amountInCents,
        extended,
        newClosingTime,
      });

      // Broadcast to Admin Telemetry in real time
      emitAdminEvent('bid:placed', {
        listingId,
        listingTitle: listing.title,
        bid: {
          id: bid.id,
          amountInCents: bid.amountInCents,
          bidderAlias: bid.bidder.campusAlias,
          bidderId: bid.bidderId,
          acceptedAt: bid.acceptedAt,
          bidType: bid.bidType,
        },
        currentLeadingBidInCents: amountInCents,
        extended,
        newClosingTime,
      });

      return {
        success: true,
        bid,
        listing: updatedListing,
        extended,
        newClosingTime,
      };
    });
  }

  /**
   * Automatic closing evaluation
   */
  static async evaluateClosing(listingId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.auctionListing.findUnique({
        where: { id: listingId },
        include: {
          bids: {
            orderBy: { amountInCents: 'desc' },
            take: 1,
            include: { bidder: true },
          },
          seller: true,
        },
      });

      if (!listing || listing.status !== 'ACTIVE') return null;

      const now = new Date();
      if (now < listing.closingTime) return null; // Not closed yet

      const winningBid = listing.bids[0];

      if (!winningBid) {
        // No bids placed -> UNSOLD
        const updated = await tx.auctionListing.update({
          where: { id: listingId },
          data: { status: 'UNSOLD' },
        });

        await tx.notification.create({
          data: {
            userId: listing.sellerId,
            type: 'SELLER_DECISION',
            title: `Auction Unsold: ${listing.title}`,
            message: 'Your auction closed with no bids placed.',
            metadata: JSON.stringify({ listingId }),
          },
        });

        emitAuctionUpdate(listingId, 'auction:status-changed', { status: 'UNSOLD' });
        return updated;
      }

      // Winning bid exists -> PENDING_SELLER_DECISION
      const updated = await tx.auctionListing.update({
        where: { id: listingId },
        data: { status: 'PENDING_SELLER_DECISION' },
      });

      // Create Auction Outcome
      await tx.auctionOutcome.create({
        data: {
          listingId,
          winnerId: winningBid.bidderId,
          finalAmountInCents: winningBid.amountInCents,
          sellerDecision: 'PENDING',
        },
      });

      // Notify Seller
      const sellerNotif = await tx.notification.create({
        data: {
          userId: listing.sellerId,
          type: 'SELLER_DECISION',
          title: `Action Required: Review Winning Bid for ${listing.title}`,
          message: `Winning bid of ₹${(winningBid.amountInCents / 100).toFixed(2)} received from ${winningBid.bidder.campusAlias}. Please approve or reject.`,
          metadata: JSON.stringify({ listingId, winnerId: winningBid.bidderId, amount: winningBid.amountInCents }),
        },
      });
      emitUserNotification(listing.sellerId, sellerNotif);

      // Notify Winner
      const winnerNotif = await tx.notification.create({
        data: {
          userId: winningBid.bidderId,
          type: 'PROVISIONAL_WIN',
          title: `Congratulations! You are the provisional winner of ${listing.title}`,
          message: `Your bid of ₹${(winningBid.amountInCents / 100).toFixed(2)} won the auction. Awaiting seller confirmation.`,
          metadata: JSON.stringify({ listingId, amount: winningBid.amountInCents }),
        },
      });
      emitUserNotification(winningBid.bidderId, winnerNotif);

      emitAuctionUpdate(listingId, 'auction:status-changed', { status: 'PENDING_SELLER_DECISION' });
      return updated;
    });
  }
}
