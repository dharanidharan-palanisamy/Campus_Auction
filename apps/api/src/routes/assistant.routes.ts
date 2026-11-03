import { Router } from 'express';
import { AuctionListing } from '../models';
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

      const listing = await AuctionListing.findOne({
        title: { $regex: query, $options: 'i' },
        status: 'ACTIVE',
        closingTime: { $gt: new Date() },
      }).populate('seller', 'campusAlias');

      if (!listing) {
        return res.json({
          success: true,
          reply: `I couldn't find an active auction matching "${query}" to prepare your bid. Try checking the title or browsing categories.`,
        });
      }

      const minNext =
        listing.currentLeadingBidInCents === 0
          ? listing.startingPriceInCents
          : listing.currentLeadingBidInCents + listing.minIncrementInCents;

      const proposedInCents = amount * 100;

      return res.json({
        success: true,
        reply: `I have prepared a bid proposal for **${listing.title}**. Please review the details below and confirm to authorize submission:`,
        proposal: {
          action: 'PLACE_BID',
          listingId: listing._id.toString(),
          title: listing.title,
          currentLeadingBid: listing.currentLeadingBidInCents,
          minAcceptable: minNext,
          proposedAmountInCents: proposedInCents,
          isEligible: proposedInCents >= minNext,
          requiresConfirmation: true,
        },
      });
    }

    // Intent: Find / Search items with budget and category awareness
    const isSearchIntent =
      lower.includes('find') ||
      lower.includes('show') ||
      lower.includes('search') ||
      lower.includes('get') ||
      lower.includes('bicycle') ||
      lower.includes('bike') ||
      lower.includes('cycle') ||
      lower.includes('calculator') ||
      lower.includes('book') ||
      lower.includes('keyboard') ||
      lower.includes('laptop') ||
      lower.includes('under') ||
      lower.includes('below');

    if (isSearchIntent) {
      // Extract price budget (e.g. "under ₹2,000", "below 3000", "under 1500")
      const priceMatch = lower.match(/(?:under|below|less than|max)\s*(?:₹|rs\.?)?\s*([0-9,]+)/i);
      let maxBudgetInCents: number | null = null;
      if (priceMatch) {
        const cleanPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
        if (!isNaN(cleanPrice)) {
          maxBudgetInCents = cleanPrice * 100;
        }
      }

      // Keyword terms
      const searchTerms: string[] = [];
      if (lower.includes('bicycle') || lower.includes('bike') || lower.includes('cycle')) searchTerms.push('bike', 'bicycle');
      if (lower.includes('calculator') || lower.includes('casio')) searchTerms.push('calculator', 'casio');
      if (lower.includes('book') || lower.includes('algorithm') || lower.includes('clrs')) searchTerms.push('book', 'algorithm');
      if (lower.includes('keyboard') || lower.includes('rgb')) searchTerms.push('keyboard');
      if (lower.includes('drafter')) searchTerms.push('drafter');

      const allActive = await AuctionListing.find({
        status: 'ACTIVE',
        closingTime: { $gt: new Date() },
      }).populate('category');

      // Filter matches by term and budget
      const matches = allActive.filter((listing: any) => {
        const currentPrice =
          listing.currentLeadingBidInCents > 0 ? listing.currentLeadingBidInCents : listing.startingPriceInCents;

        // Check budget if requested
        if (maxBudgetInCents !== null && currentPrice > maxBudgetInCents) {
          return false;
        }

        // Check keyword matches if any were identified
        if (searchTerms.length > 0) {
          const categoryName = listing.category?.name || '';
          const content = `${listing.title} ${listing.description} ${categoryName}`.toLowerCase();
          return searchTerms.some((st) => content.includes(st));
        }

        return true;
      });

      if (matches.length === 0) {
        const availableItems = allActive.filter((l: any) => {
          if (searchTerms.length > 0) {
            const categoryName = l.category?.name || '';
            const content = `${l.title} ${l.description} ${categoryName}`.toLowerCase();
            return searchTerms.some((st) => content.includes(st));
          }
          return false;
        });

        if (availableItems.length > 0 && maxBudgetInCents !== null) {
          const item = availableItems[0] as any;
          const curr = item.currentLeadingBidInCents > 0 ? item.currentLeadingBidInCents : item.startingPriceInCents;
          return res.json({
            success: true,
            reply: `I found **${item.title}** (${item.category?.name || 'General'}), but its current leading bid is **₹${(curr / 100).toFixed(0)}**, which exceeds your budget of ₹${(maxBudgetInCents / 100).toFixed(0)}. Would you like me to prepare a bid proposal for ₹${(curr / 100).toFixed(0)}, or notify you when a cheaper listing appears?`,
          });
        }

        return res.json({
          success: true,
          reply: "I couldn't find any active listings matching your query right now. Would you like to save this as a saved search to get notified when someone lists it?",
        });
      }

      const summaries = matches
        .map((l: any) => {
          const price = l.currentLeadingBidInCents > 0 ? l.currentLeadingBidInCents : l.startingPriceInCents;
          return `- **${l.title}** (${l.category?.name || 'General'}): Current price **₹${(price / 100).toFixed(0)}**, Condition: ${l.condition}`;
        })
        .join('\n');

      return res.json({
        success: true,
        reply: `Here are the matching campus auctions I found:\n\n${summaries}\n\nWould you like me to prepare a bid proposal for any of these?`,
      });
    }

    return res.json({
      success: true,
      reply: `Hi ${req.user!.campusAlias}! I am your Campus Auction Assistant. You can ask me to:
- Find bicycles, calculators, or study books under your budget
- Check closing times and leading bids
- Prepare safe bid proposals with explicit confirmation
How can I assist you with your campus deals today?`,
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
      bidType: 'AI_CONFIRMED',
    });

    return res.json({
      success: true,
      message: `Confirmed! Your bid of ₹${(amountInCents / 100).toFixed(2)} was successfully accepted.`,
      result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
