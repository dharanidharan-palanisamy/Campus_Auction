import { Router } from 'express';
import mongoose from 'mongoose';
import {
  AuctionListing,
  Category,
  Bid,
  Question,
  AuctionOutcome,
  HandoverRecord,
  SavedListing,
  AutoBidLimit,
  User,
} from '../models';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import { BiddingService } from '../services/bidding.service';
import {
  createListingSchema,
  updateListingSchema,
  placeBidSchema,
  sellerDecisionSchema,
  handoverRecordSchema,
  questionSchema,
  answerSchema,
} from '@campus/shared';
import { emitAdminEvent } from '../lib/socket';
import { TrustService } from '../services/trust.service';
import { HandoverService } from '../services/handover.service';
import { PricingEstimatorService } from '../services/pricing-estimator.service';
import { AppointmentService } from '../services/appointment.service';
import { IntelligenceService } from '../services/intelligence.service';

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
      closing_soon,
      max_hours = '3',
      page = '1',
      limit = '12',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * take;

    const now = new Date();
    const filter: any = {};
    const isClosingSoonOnly = closing_soon === 'true';

    if (isClosingSoonOnly) {
      const maxHours = parseFloat(max_hours as string) || 3;
      const cutoff = new Date(now.getTime() + maxHours * 3600 * 1000);
      filter.status = 'ACTIVE';
      filter.closingTime = { $gt: now, $lte: cutoff };
    } else if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        filter.status = 'ACTIVE';
        filter.closingTime = { $gt: now };
      } else if (status === 'ENDED') {
        filter.status = { $in: ['COMPLETED', 'UNSOLD', 'CANCELLED', 'REJECTED'] };
      } else {
        filter.status = status;
        if (sort === 'closing_soon') {
          filter.closingTime = { $gt: now };
        }
      }
    } else if (sort === 'closing_soon') {
      filter.status = 'ACTIVE';
      filter.closingTime = { $gt: now };
    }

    if (category) {
      const catDoc = await Category.findOne({ slug: category as string });
      if (catDoc) {
        filter.categoryId = catDoc._id;
      } else {
        // No match for this category slug
        return res.json({
          success: true,
          data: [],
          pagination: { page: pageNum, limit: take, total: 0, totalPages: 0 },
        });
      }
    }

    if (condition) {
      filter.condition = condition as string;
    }

    if (minPrice || maxPrice) {
      filter.currentLeadingBidInCents = {};
      if (minPrice) filter.currentLeadingBidInCents.$gte = parseInt(minPrice as string, 10) * 100;
      if (maxPrice) filter.currentLeadingBidInCents.$lte = parseInt(maxPrice as string, 10) * 100;
    }

    if (q) {
      const terms = (q as string).trim().split(/\s+/).filter(Boolean);
      const regexes = terms.map((t) => new RegExp(t, 'i'));
      filter.$and = regexes.map((reg) => ({
        $or: [{ title: reg }, { description: reg }],
      }));
    }

    let sortOption: any = { closingTime: 1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'price_low') sortOption = { currentLeadingBidInCents: 1 };
    if (sort === 'price_high') sortOption = { currentLeadingBidInCents: -1 };
    if ((!status || status === 'ALL') && !isClosingSoonOnly && sort !== 'closing_soon') {
      sortOption = { createdAt: -1 };
    }
    if (isClosingSoonOnly) {
      sortOption = { closingTime: 1 };
    }

    const [total, listings] = await Promise.all([
      AuctionListing.countDocuments(filter),
      AuctionListing.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(take)
        .populate('category', 'name slug icon')
        .populate('seller', 'fullName campusAlias email')
        .lean(),
    ]);

    // Attach _count for bids and questions to preserve exact contract
    const listingIds = listings.map((l: any) => l._id);
    const [bidCounts, questionCounts] = await Promise.all([
      Bid.aggregate([
        { $match: { listingId: { $in: listingIds } } },
        { $group: { _id: '$listingId', count: { $sum: 1 } } },
      ]),
      Question.aggregate([
        { $match: { listingId: { $in: listingIds } } },
        { $group: { _id: '$listingId', count: { $sum: 1 } } },
      ]),
    ]);

    const bidCountMap = new Map<string, number>();
    bidCounts.forEach((b: any) => bidCountMap.set(b._id.toString(), b.count));

    const questionCountMap = new Map<string, number>();
    questionCounts.forEach((q: any) => questionCountMap.set(q._id.toString(), q.count));

    const formattedListings = listings.map((l: any) => {
      const idStr = l._id.toString();
      return {
        ...l,
        id: idStr,
        _count: {
          bids: bidCountMap.get(idStr) || 0,
          questions: questionCountMap.get(idStr) || 0,
        },
      };
    });

    return res.json({
      success: true,
      data: formattedListings,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Categories List
auctionRouter.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).lean();

    // Compute active listing count per category
    const activeCounts = await AuctionListing.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    activeCounts.forEach((c: any) => countMap.set(c._id.toString(), c.count));

    const formatted = categories.map((cat: any) => ({
      ...cat,
      id: cat._id.toString(),
      _count: {
        listings: countMap.get(cat._id.toString()) || 0,
      },
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Single Auction Detail
auctionRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    const listing = await AuctionListing.findById(id)
      .populate('category')
      .populate('seller', 'id fullName campusAlias email createdAt')
      .lean();

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    const [bids, questions, outcome, handover] = await Promise.all([
      Bid.find({ listingId: listing._id })
        .sort({ acceptedAt: -1 })
        .populate('bidder', 'id campusAlias')
        .lean(),
      Question.find({ listingId: listing._id })
        .sort({ createdAt: -1 })
        .populate('asker', 'campusAlias')
        .populate('answers.sellerId', 'campusAlias')
        .lean(),
      AuctionOutcome.findOne({ listingId: listing._id }).lean(),
      HandoverRecord.findOne({ listingId: listing._id }).lean(),
    ]);

    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      id: q._id.toString(),
      answers: (q.answers || []).map((ans: any) => ({
        ...ans,
        id: ans._id?.toString(),
        seller: ans.sellerId,
      })),
    }));

    const formattedBids = bids.map((b: any) => ({
      ...b,
      id: b._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        ...listing,
        id: listing._id.toString(),
        images: (listing.images || []).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)),
        bids: formattedBids,
        questions: formattedQuestions,
        outcome: outcome ? { ...outcome, id: outcome._id.toString() } : null,
        handover: handover ? { ...handover, id: handover._id.toString() } : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Create Listing (Authenticated student)
auctionRouter.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validated = createListingSchema.parse(req.body);

    const listing = await AuctionListing.create({
      sellerId: new mongoose.Types.ObjectId(req.user!.id),
      categoryId: new mongoose.Types.ObjectId(validated.categoryId),
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
      images: validated.imageUrls.map((url, index) => ({
        url,
        displayOrder: index,
      })),
    });

    await listing.populate('category');
    await listing.populate('seller', 'id fullName campusAlias email department');

    const result = listing.toJSON();

    // Notify Admin Panel in real time
    emitAdminEvent('listing:created', {
      listing: {
        ...result,
        _count: { bids: 0 },
      },
    });

    return res.status(201).json({ success: true, data: result });
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
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const listing = await AuctionListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the seller or admin can update this listing' });
    }

    const validated = updateListingSchema.parse(req.body);

    const bidCount = await Bid.countDocuments({ listingId: listing._id });
    const hasBids = bidCount > 0;
    if (hasBids && (validated.startingPriceInCents !== undefined || validated.minIncrementInCents !== undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Starting price and increment cannot be modified once bids have been placed.',
      });
    }

    if (validated.title !== undefined) listing.title = validated.title;
    if (validated.description !== undefined) listing.description = validated.description;
    if (validated.categoryId !== undefined) listing.categoryId = new mongoose.Types.ObjectId(validated.categoryId);
    if (validated.condition !== undefined) listing.condition = validated.condition;
    if (validated.pickupLocation !== undefined) listing.pickupLocation = validated.pickupLocation;
    if (validated.sellerNotes !== undefined) listing.sellerNotes = validated.sellerNotes || undefined;
    if (validated.closingTime !== undefined) listing.closingTime = new Date(validated.closingTime);
    if (!hasBids) {
      if (validated.startingPriceInCents !== undefined) listing.startingPriceInCents = validated.startingPriceInCents;
      if (validated.minIncrementInCents !== undefined) listing.minIncrementInCents = validated.minIncrementInCents;
    }

    if (validated.imageUrls && validated.imageUrls.length > 0) {
      listing.images = validated.imageUrls.map((url, index) => ({
        url,
        displayOrder: index,
      }));
    }

    await listing.save();
    await listing.populate('category');
    await listing.populate('seller', 'id campusAlias email createdAt');

    const [bids, questions] = await Promise.all([
      Bid.find({ listingId: listing._id }).sort({ acceptedAt: -1 }).populate('bidder', 'id campusAlias').lean(),
      Question.find({ listingId: listing._id }).sort({ createdAt: -1 }).populate('asker', 'campusAlias').lean(),
    ]);

    const formatted = {
      ...listing.toJSON(),
      bids: bids.map((b: any) => ({ ...b, id: b._id.toString() })),
      questions: questions.map((q: any) => ({ ...q, id: q._id.toString() })),
    };

    return res.json({ success: true, data: formatted, message: 'Listing updated successfully' });
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
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const listing = await AuctionListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the seller or admin can delete this listing' });
    }

    // Cascade delete related records
    await Promise.all([
      SavedListing.deleteMany({ listingId: listing._id }),
      Bid.deleteMany({ listingId: listing._id }),
      Question.deleteMany({ listingId: listing._id }),
      AutoBidLimit.deleteMany({ listingId: listing._id }),
      AuctionOutcome.deleteMany({ listingId: listing._id }),
      HandoverRecord.deleteMany({ listingId: listing._id }),
      AuctionListing.findByIdAndDelete(listing._id),
    ]);

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
      bidType: 'MANUAL',
    });

    return res.status(201).json({ ...result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 5.1 Set Auto-Bid Limit
auctionRouter.post('/:id/auto-bid', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { maxLimitInCents } = req.body;
    const listingId = req.params.id;

    if (!maxLimitInCents || maxLimitInCents <= 0) {
      return res.status(400).json({ success: false, message: 'Valid maxLimitInCents is required' });
    }

    const listing = await AuctionListing.findById(listingId);
    if (!listing || listing.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Auction is not active' });
    }

    if (listing.sellerId.toString() === req.user!.id) {
      return res.status(403).json({ success: false, message: 'Sellers cannot set auto-bids on their own listings' });
    }

    const autoBid = await AutoBidLimit.findOneAndUpdate(
      { listingId: listing._id, bidderId: new mongoose.Types.ObjectId(req.user!.id) },
      {
        listingId: listing._id,
        bidderId: new mongoose.Types.ObjectId(req.user!.id),
        maxLimitInCents: Number(maxLimitInCents),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: 'Automatic proxy bid limit saved successfully',
      data: {
        id: autoBid._id.toString(),
        listingId,
        isActive: autoBid.isActive,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 6. Seller Decision (Approve or Reject winning bid)
auctionRouter.post('/:id/decision', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { decision, rejectionReason } = sellerDecisionSchema.parse(req.body);
    const listingId = req.params.id;

    const listing = await AuctionListing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.sellerId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can decide on this auction' });
    }

    if (decision === 'APPROVE') {
      listing.status = 'RESERVED';
      await listing.save();

      await AuctionOutcome.findOneAndUpdate(
        { listingId: listing._id },
        { sellerDecision: 'APPROVED', decidedAt: new Date() }
      );

      // Initialize Handover record
      await HandoverRecord.findOneAndUpdate(
        { listingId: listing._id },
        {
          listingId: listing._id,
          sellerId: listing.sellerId,
          handoverStatus: 'PENDING',
          pickupNotes: `Scheduled pickup at ${listing.pickupLocation}`,
        },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        status: 'RESERVED',
        message: 'Winning bid approved. Item is now reserved for pickup.',
      });
    } else {
      listing.status = 'REJECTED';
      await listing.save();

      await AuctionOutcome.findOneAndUpdate(
        { listingId: listing._id },
        {
          sellerDecision: 'REJECTED',
          rejectionReason: rejectionReason || 'Seller declined transaction',
          decidedAt: new Date(),
        }
      );

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

    const listing = await AuctionListing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    const outcome = await AuctionOutcome.findOne({ listingId: listing._id });
    const isSeller = listing.sellerId.toString() === req.user!.id;
    const isWinner = outcome?.winnerId?.toString() === req.user!.id;

    if (!isSeller && !isWinner) {
      return res.status(403).json({ success: false, message: 'Not authorized for this handover' });
    }

    const finalStatus = status === 'COMPLETED' ? 'COMPLETED' : 'PICKUP_FAILED';
    listing.status = finalStatus;
    await listing.save();

    await HandoverRecord.findOneAndUpdate(
      { listingId: listing._id },
      {
        listingId: listing._id,
        sellerId: listing.sellerId,
        buyerId: outcome?.winnerId,
        handoverStatus: status,
        pickupNotes,
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: `Handover recorded as ${finalStatus}` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 8. Q&A Endpoints
auctionRouter.post('/:id/questions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = questionSchema.parse(req.body);
    const listingId = req.params.id;

    const question = await Question.create({
      listingId: new mongoose.Types.ObjectId(listingId),
      askerId: new mongoose.Types.ObjectId(req.user!.id),
      content,
      answers: [],
    });

    await question.populate('asker', 'campusAlias');

    return res.status(201).json({ success: true, data: question.toJSON() });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.post('/questions/:questionId/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = answerSchema.parse(req.body);
    const question = await Question.findById(req.params.questionId);

    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    const listing = await AuctionListing.findById(question.listingId);
    if (!listing || listing.sellerId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Only the item seller can answer this question' });
    }

    const newAnswer = {
      _id: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(req.user!.id),
      content,
      createdAt: new Date(),
    };

    question.answers.push(newAnswer as any);
    await question.save();

    const user = await User.findById(req.user!.id).select('campusAlias');

    return res.status(201).json({
      success: true,
      data: {
        id: newAnswer._id.toString(),
        content: newAnswer.content,
        createdAt: newAnswer.createdAt,
        seller: {
          campusAlias: user?.campusAlias || 'Seller',
        },
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEATURE 1: CAMPUS TRUST SCORE & SELLER REPUTATION
// ==========================================
auctionRouter.get('/users/:userId/trust', async (req, res) => {
  try {
    const profile = await TrustService.getUserTrustProfile(req.params.userId);
    return res.json({ success: true, data: profile });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.post('/:id/reviews', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { overallRating, itemAccuracyRating, communicationRating, comment } = req.body;
    const review = await TrustService.submitReview({
      listingId: req.params.id,
      buyerId: req.user!.id,
      overallRating: Number(overallRating) || 5,
      itemAccuracyRating: Number(itemAccuracyRating) || Number(overallRating) || 5,
      communicationRating: Number(communicationRating) || Number(overallRating) || 5,
      comment,
    });
    return res.status(201).json({ success: true, data: review, message: 'Review recorded and seller trust score updated.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEATURE 2: QR VERIFIED CAMPUS HANDOVER
// ==========================================
auctionRouter.get('/:id/handover/pass', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const pass = await HandoverService.getOrCreateHandoverPass(req.params.id, req.user!.id);
    return res.json({ success: true, data: pass });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.post('/:id/handover/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token, code, notes } = req.body;
    const result = await HandoverService.verifyHandover({
      listingId: req.params.id,
      actorUserId: req.user!.id,
      token,
      code,
      notes,
    });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEATURE 3: AI SMART PRICE ESTIMATOR
// ==========================================
auctionRouter.post('/estimate-price', async (req, res) => {
  try {
    const { title, categoryId, condition, description, imageUrl } = req.body;
    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Item title is required for price estimation.' });
    }
    const estimate = await PricingEstimatorService.estimatePrice({
      title,
      categoryId,
      condition: condition || 'GOOD',
      description,
      imageUrl,
    });
    return res.json({ success: true, data: estimate });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEATURE 4: CAMPUS PICKUP APPOINTMENTS
// ==========================================
auctionRouter.get('/:id/appointments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = await AppointmentService.getListingAppointments(req.params.id, req.user!.id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.post('/:id/appointments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { slotTime, locationName, locationDetails, notes } = req.body;
    if (!slotTime || !locationName) {
      return res.status(400).json({ success: false, message: 'Slot time and location name are required.' });
    }
    const appointment = await AppointmentService.bookAppointment({
      listingId: req.params.id,
      userId: req.user!.id,
      slotTime,
      locationName,
      locationDetails,
      notes,
    });
    return res.status(201).json({ success: true, data: appointment, message: 'Pickup appointment scheduled successfully.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

auctionRouter.patch('/appointments/:appointmentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, newSlotTime, notes } = req.body;
    const updated = await AppointmentService.updateStatus({
      appointmentId: req.params.appointmentId,
      userId: req.user!.id,
      status: status || 'CONFIRMED',
      newSlotTime,
      notes,
    });
    return res.json({ success: true, data: updated, message: `Appointment status updated to ${updated.status}` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEATURE 5: AUCTION PRICE INTELLIGENCE
// ==========================================
auctionRouter.get('/intelligence/overview', async (req, res) => {
  try {
    const overview = await IntelligenceService.getMarketOverview();
    return res.json({ success: true, data: overview });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
