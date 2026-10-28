import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import { BiddingService } from '../services/bidding.service';

export const assistantRouter = Router();

/**
 * AI Campus Auction Assistant
 * Supported tool actions:
 * - search_auctions: Filter listings by title, category, maxPrice
 * - get_auction_details: Inspect item, condition, current bid
 * - create_bid_proposal: Format a structured bid proposal requiring explicit student confirmation
 * - confirm_bid_proposal: Authorize and execute confirmed bid through standard transactional BiddingService
 */

assistantRouter.post('/chat', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const lower = message.toLowerCase();

    // Intent: Propose a bid (e.g. "bid 2800 on bicycle", "prepare bid of 800 on calculator")
    const bidMatch = lower.match(/(?:bid|offer|place bid of?)\s*(?:₹|rs\.?)?\s*(\d+)\s*(?:on|for)\s*([a-z0-9\s]+)/i);
    if (bidMatch) {
      const amount = parseInt(bidMatch[1], 10);
      const query = bidMatch[2].trim();

      const listing = await prisma.auctionListing.findFirst({
        where: {
          title: { contains: query },
          status: 'ACTIVE'
        },
        include: { seller: { select: { campusAlias: true } } }
      });

      if (!listing) {
        return res.json({
          success: true,
          reply: `I couldn't find an active auction matching "${query}" to prepare your bid. Try checking the title or browsing categories.`
        });
      }

      const minNext = listing.currentLeadingBidInCents === 0
        ? listing.startingPriceInCents
        : listing.currentLeadingBidInCents + listing.minIncrementInCents;

      const proposedInCents = amount * 100;

      return res.json({
        success: true,
        reply: `I have prepared a bid proposal for **${listing.title}**. Please review the details below and confirm to authorize submission:`,
        proposal: {
          action: 'PLACE_BID',
          listingId: listing.id,
          title: listing.title,
          currentLeadingBid: listing.currentLeadingBidInCents,
          minAcceptable: minNext,
          proposedAmountInCents: proposedInCents,
          isEligible: proposedInCents >= minNext,
          requiresConfirmation: true
        }
      });
    }

    // Intent: Find / Search items
    if (lower.includes('find') || lower.includes('show') || lower.includes('search') || lower.includes('bicycle') || lower.includes('calculator') || lower.includes('book') || lower.includes('keyboard')) {
      const keywords = ['bicycle', 'calculator', 'book', 'keyboard', 'laptop', 'lamp', 'cycle'];
      let term = '';
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          term = kw;
          break;
        }
      }

      const listings = await prisma.auctionListing.findMany({
        where: {
          status: 'ACTIVE',
          ...(term ? { OR: [{ title: { contains: term } }, { description: { contains: term } }] } : {})
        },
        take: 3,
        include: { category: true }
      });

      if (listings.length === 0) {
        return res.json({
          success: true,
          reply: "I couldn't find any active listings matching your query right now. Would you like to save this as a saved search to get notified when someone lists it?"
        });
      }

      const summaries = listings.map(l =>
        `- **${l.title}** (${l.category.name}): Current bid ₹${((l.currentLeadingBidInCents || l.startingPriceInCents) / 100).toFixed(2)}, Condition: ${l.condition}`
      ).join('\n');

      return res.json({
        success: true,
        reply: `Here are the matching campus auctions I found:\n\n${summaries}\n\nWould you like me to prepare a bid proposal for any of these?`
      });
    }

    return res.json({
      success: true,
      reply: `Hi ${req.user!.campusAlias}! I am your Campus Auction Assistant. You can ask me to:
- Find bicycles, calculators, or study books under your budget
- Check closing times and leading bids
- Prepare safe bid proposals with explicit confirmation
How can I assist you with your campus deals today?`
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Explicit confirmation endpoint for AI-prepared bid proposals
assistantRouter.post('/confirm', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { listingId, amountInCents } = req.body;
    if (!listingId || !amountInCents) {
      return res.status(400).json({ success: false, message: 'Missing proposal confirmation parameters' });
    }

    const result = await BiddingService.placeBid({
      listingId,
      bidderId: req.user!.id,
      amountInCents: Number(amountInCents),
      bidType: 'AI_CONFIRMED'
    });

    return res.json({
      success: true,
      message: `Confirmed! Your bid of ₹${(amountInCents / 100).toFixed(2)} was successfully accepted.`,
      result
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
