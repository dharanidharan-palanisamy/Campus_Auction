import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest, requireAdmin } from '../middlewares/auth';
import { BiddingService } from '../services/bidding.service';
import { createListingSchema, updateListingSchema, placeBidSchema, sellerDecisionSchema, handoverRecordSchema, questionSchema, answerSchema } from '@campus/shared';

export const auctionRouter = Router();

// 1. Browse & Search Auctions with multi-filter & pagination
auctionRouter.get('/', async (req, res) => {
  try {
    const {
      q,
      category,
      condition,
      minPrice,
      maxPrice,
      status = 'ACTIVE',
      sort = 'closing_soon',
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * take;

    const now = new Date();
    const where: any = {};

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        // Active = status ACTIVE + closing time in the future
        where.status = 'ACTIVE';
        where.closingTime = { gt: now };
      } else if (status === 'ENDED') {
        // Ended = COMPLETED or UNSOLD or CANCELLED
        where.status = { in: ['COMPLETED', 'UNSOLD', 'CANCELLED', 'REJECTED'] };
      } else {
        where.status = status;
        if (sort === 'closing_soon') {
          where.closingTime = { gt: now };
        }
      }
    } else if (sort === 'closing_soon') {
      // closing_soon sort implies only active auctions
      where.status = 'ACTIVE';
      where.closingTime = { gt: now };
    }
    // status === 'ALL' or no status: no filter → return everything

    if (category) {
      where.category = { slug: category as string };
    }

    if (condition) {
      where.condition = condition as string;
    }

    if (minPrice || maxPrice) {
      where.currentLeadingBidInCents = {};
      if (minPrice) where.currentLeadingBidInCents.gte = parseInt(minPrice as string, 10) * 100;
      if (maxPrice) where.currentLeadingBidInCents.lte = parseInt(maxPrice as string, 10) * 100;
    }

    if (q) {
      const searchTerms = (q as string).trim().split(/\s+/).filter(Boolean);
      where.AND = searchTerms.map((term) => ({
        OR: [
          { title: { contains: term } },
          { description: { contains: term } },
          { category: { name: { contains: term } } },
          { category: { slug: { contains: term } } },
        ],
      }));
    }

    let orderBy: any = { closingTime: 'asc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'price_low') orderBy = { currentLeadingBidInCents: 'asc' };
    if (sort === 'price_high') orderBy = { currentLeadingBidInCents: 'desc' };
    // For 'all' status view, default to newest
    if (!status || status === 'ALL') orderBy = { createdAt: 'desc' };

    const [total, auctions] = await Promise.all([
      prisma.auctionListing.count({ where }),
      prisma.auctionListing.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          category: { select: { name: true, slug: true, icon: true } },
          images: { orderBy: { displayOrder: 'asc' } },
          seller: { select: { id: true, campusAlias: true, email: true } },
          _count: { select: { bids: true, questions: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      data: auctions,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Categories List
auctionRouter.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { listings: { where: { status: 'ACTIVE' } } } }
      }
    });
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Single Auction Detail
auctionRouter.get('/:id', async (req, res) => {
  try {
    const auction = await prisma.auctionListing.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        seller: { select: { id: true, campusAlias: true, email: true, createdAt: true } },
        bids: {
          orderBy: { acceptedAt: 'desc' },
          include: { bidder: { select: { id: true, campusAlias: true } } }
        },
        questions: {
          orderBy: { createdAt: 'desc' },
          include: {
            asker: { select: { campusAlias: true } },
            answers: {
              include: { seller: { select: { campusAlias: true } } }
            }
          }
        },
        outcome: true,
        handover: true
      }
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    return res.json({ success: true, data: auction });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Create Listing (Authenticated student)
auctionRouter.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validated = createListingSchema.parse(req.body);

    const listing = await prisma.auctionListing.create({
      data: {
        sellerId: req.user!.id,
        categoryId: validated.categoryId,
        title: validated.title,
        description: validated.description,
        condition: validated.condition,
        startingPriceInCents: validated.startingPriceInCents,
        minIncrementInCents: validated.minIncrementInCents,
        currentLeadingBidInCents: 0,
        status: 'ACTIVE',
        startTime: validated.startTime ? new Date(validated.startTime) : new Date(),
        closingTime: new Date(validated.closingTime),
        pickupLocation: validated.pickupLocation,
        sellerNotes: validated.sellerNotes,
        images: {
          create: validated.imageUrls.map((url, index) => ({
            url,
            displayOrder: index
          }))
        }
      },
      include: {
        images: true,
        category: true
      }
    });

    return res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    if (error?.errors) {
      const msg = error.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 4.1 Update Listing (Seller or Admin)
const updateListingHandler = async (req: AuthRequest, res: any) => {
  try {
    const listingId = req.params.id;
    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId },
      include: { bids: { select: { id: true } } }
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the seller or admin can update this listing' });
    }

    const validated = updateListingSchema.parse(req.body);

    const hasBids = listing.bids.length > 0;
    if (hasBids && (validated.startingPriceInCents !== undefined || validated.minIncrementInCents !== undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Starting price and increment cannot be modified once bids have been placed.'
      });
    }

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.categoryId !== undefined) updateData.categoryId = validated.categoryId;
    if (validated.condition !== undefined) updateData.condition = validated.condition;
    if (validated.pickupLocation !== undefined) updateData.pickupLocation = validated.pickupLocation;
    if (validated.sellerNotes !== undefined) updateData.sellerNotes = validated.sellerNotes;
    if (validated.closingTime !== undefined) updateData.closingTime = new Date(validated.closingTime);
    if (!hasBids) {
      if (validated.startingPriceInCents !== undefined) updateData.startingPriceInCents = validated.startingPriceInCents;
      if (validated.minIncrementInCents !== undefined) updateData.minIncrementInCents = validated.minIncrementInCents;
    }

    if (validated.imageUrls && validated.imageUrls.length > 0) {
      await prisma.listingImage.deleteMany({ where: { listingId } });
      await prisma.listingImage.createMany({
        data: validated.imageUrls.map((url, index) => ({
          listingId,
          url,
          displayOrder: index
        }))
      });
    }

    const updated = await prisma.auctionListing.update({
      where: { id: listingId },
      data: updateData,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        category: true,
        seller: { select: { id: true, campusAlias: true, email: true, createdAt: true } },
        bids: {
          orderBy: { acceptedAt: 'desc' },
          include: { bidder: { select: { id: true, campusAlias: true } } }
        },
        questions: {
          orderBy: { createdAt: 'desc' },
          include: {
            asker: { select: { campusAlias: true } },
            answers: { include: { seller: { select: { campusAlias: true } } } }
          }
        }
      }
    });

    return res.json({ success: true, data: updated, message: 'Listing updated successfully' });
  } catch (error: any) {
    if (error?.errors) {
      const msg = error.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

auctionRouter.patch('/:id', authenticateToken, updateListingHandler);
auctionRouter.put('/:id', authenticateToken, updateListingHandler);

// 4.2 Delete Listing (Seller or Admin)
auctionRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const listingId = req.params.id;
    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId },
      include: { bids: { select: { id: true } } }
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the seller or admin can delete this listing' });
    }

    // Clean up any saved listings first
    await prisma.savedListing.deleteMany({ where: { listingId } });

    // Delete listing (all related records cascade delete)
    await prisma.auctionListing.delete({ where: { id: listingId } });

    return res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Place Bid (Transactional, Anti-Sniping)
auctionRouter.post('/:id/bids', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amountInCents, idempotencyKey } = placeBidSchema.parse(req.body);

    const result = await BiddingService.placeBid({
      listingId: req.params.id,
      bidderId: req.user!.id,
      amountInCents,
      idempotencyKey,
      bidType: 'MANUAL'
    });

    return res.status(201).json({ ...result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 6. Seller Decision (Approve or Reject winning bid)
auctionRouter.post('/:id/decision', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { decision, rejectionReason } = sellerDecisionSchema.parse(req.body);
    const listingId = req.params.id;

    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId },
      include: { outcome: true }
    });

    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.sellerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can decide on this auction' });
    }

    if (decision === 'APPROVE') {
      await prisma.auctionListing.update({
        where: { id: listingId },
        data: { status: 'RESERVED' }
      });

      await prisma.auctionOutcome.update({
        where: { listingId },
        data: {
          sellerDecision: 'APPROVED',
          decidedAt: new Date()
        }
      });

      // Initialize Handover record
      await prisma.handoverRecord.create({
        data: {
          listingId,
          handoverStatus: 'PENDING',
          pickupNotes: `Scheduled pickup at ${listing.pickupLocation}`
        }
      });

      return res.json({ success: true, status: 'RESERVED', message: 'Winning bid approved. Item is now reserved for pickup.' });
    } else {
      await prisma.auctionListing.update({
        where: { id: listingId },
        data: { status: 'REJECTED' }
      });

      await prisma.auctionOutcome.update({
        where: { listingId },
        data: {
          sellerDecision: 'REJECTED',
          rejectionReason: rejectionReason || 'Seller declined transaction',
          decidedAt: new Date()
        }
      });

      return res.json({ success: true, status: 'REJECTED', message: 'Winning bid was rejected.' });
    }
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 7. Complete Handover
auctionRouter.post('/:id/handover', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, pickupNotes } = handoverRecordSchema.parse(req.body);
    const listingId = req.params.id;

    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId },
      include: { outcome: true }
    });

    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.sellerId !== req.user!.id && listing.outcome?.winnerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this handover' });
    }

    const finalStatus = status === 'COMPLETED' ? 'COMPLETED' : 'PICKUP_FAILED';

    await prisma.auctionListing.update({
      where: { id: listingId },
      data: { status: finalStatus }
    });

    await prisma.handoverRecord.upsert({
      where: { listingId },
      update: {
        handoverStatus: status,
        pickupNotes,
        completedAt: new Date()
      },
      create: {
        listingId,
        handoverStatus: status,
        pickupNotes,
        completedAt: new Date()
      }
    });

    return res.json({ success: true, message: `Handover recorded as ${finalStatus}` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 8. Q&A Endpoints
auctionRouter.post('/:id/questions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = questionSchema.parse(req.body);
    const question = await prisma.question.create({
      data: {
        listingId: req.params.id,
        askerId: req.user!.id,
        content
      },
      include: { asker: { select: { campusAlias: true } } }
    });
    return res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.post('/questions/:questionId/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = answerSchema.parse(req.body);
    const question = await prisma.question.findUnique({
      where: { id: req.params.questionId },
      include: { listing: true }
    });

    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    if (question.listing.sellerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Only the item seller can answer this question' });
    }

    const answer = await prisma.questionAnswer.create({
      data: {
        questionId: question.id,
        sellerId: req.user!.id,
        content
      },
      include: { seller: { select: { campusAlias: true } } }
    });

    return res.status(201).json({ success: true, data: answer });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});