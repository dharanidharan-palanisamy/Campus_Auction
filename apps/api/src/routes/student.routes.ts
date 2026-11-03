import { Router } from 'express';
import mongoose from 'mongoose';
import {
  AuctionListing,
  Bid,
  AuctionOutcome,
  SavedListing,
  Notification,
  User,
} from '../models';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

export const studentRouter = Router();

studentRouter.use(authenticateToken);

// 1. Student Dashboard Activity (Buyer & Seller metrics)
studentRouter.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      activeListingsRaw,
      userBidsListings,
      wonOutcomes,
      savedItemsCount,
      unreadNotificationsCount,
    ] = await Promise.all([
      // Seller: active listings
      AuctionListing.find({ sellerId: userObjectId, status: 'ACTIVE' }).lean(),
      // Buyer: distinct listings where user placed a bid
      Bid.distinct('listingId', { bidderId: userObjectId }),
      // Provisional wins / won outcomes
      AuctionOutcome.find({ winnerId: userObjectId })
        .populate({
          path: 'listing',
          populate: { path: 'seller', select: 'campusAlias' },
        })
        .lean(),
      // Saved listings
      SavedListing.countDocuments({ userId: userObjectId }),
      // Unread notifications
      Notification.countDocuments({ userId: userObjectId, isRead: false }),
    ]);

    // Attach bid counts for seller's active listings
    const listingIds = activeListingsRaw.map((l: any) => l._id);
    const bidCounts = await Bid.aggregate([
      { $match: { listingId: { $in: listingIds } } },
      { $group: { _id: '$listingId', count: { $sum: 1 } } },
    ]);
    const bidCountMap = new Map<string, number>();
    bidCounts.forEach((b: any) => bidCountMap.set(b._id.toString(), b.count));

    const activeListings = activeListingsRaw.map((l: any) => ({
      ...l,
      id: l._id.toString(),
      _count: { bids: bidCountMap.get(l._id.toString()) || 0 },
    }));

    const wonAuctions = wonOutcomes.map((w: any) => ({
      ...w,
      id: w._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        activeListings,
        activeBidsCount: userBidsListings.length,
        wonAuctions,
        savedItemsCount,
        unreadNotificationsCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Notifications
studentRouter.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const notifications = await Notification.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formatted = notifications.map((n: any) => ({
      ...n,
      id: n._id.toString(),
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

studentRouter.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: userObjectId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, data: notification.toJSON() });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3. Saved Listings
studentRouter.get('/saved-listings', async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const saved = await SavedListing.find({ userId: userObjectId }).lean();
    const listingIds = saved.map((s: any) => s.listingId);

    const listings = await AuctionListing.find({ _id: { $in: listingIds } })
      .populate('category')
      .lean();

    const formatted = listings.map((l: any) => ({
      ...l,
      id: l._id.toString(),
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

studentRouter.post('/saved-listings/:listingId', async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const listingObjectId = new mongoose.Types.ObjectId(req.params.listingId);

    const existing = await SavedListing.findOne({
      userId: userObjectId,
      listingId: listingObjectId,
    });

    if (existing) {
      await SavedListing.findByIdAndDelete(existing._id);
      return res.json({ success: true, saved: false, message: 'Removed from saved listings' });
    } else {
      await SavedListing.create({
        userId: userObjectId,
        listingId: listingObjectId,
      });
      return res.json({ success: true, saved: true, message: 'Saved to wishlist' });
    }
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. STUDENT PERSONAL DETAILS CRUD
// ==========================================

// View Full Personal Details
studentRouter.get('/profile', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    return res.json({ success: true, data: user.toJSON() });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Add / Edit Personal Details
studentRouter.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const { fullName, campusAlias, department, college, phone, bio, avatarUrl } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Check alias uniqueness if changed
    if (campusAlias && campusAlias.trim().toLowerCase() !== user.campusAlias.toLowerCase()) {
      const existing = await User.findOne({
        campusAlias: campusAlias.trim(),
        _id: { $ne: user._id },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Campus alias is already taken by another student' });
      }
      user.campusAlias = campusAlias.trim();
    }

    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (department !== undefined) user.department = department.trim();
    if (college !== undefined) user.college = college.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();

    await user.save();

    const updated = await User.findById(user._id).select('-passwordHash');
    return res.json({
      success: true,
      data: updated?.toJSON(),
      message: 'Personal details updated successfully',
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Delete specific optional detail (phone, bio, department, college, avatarUrl)
studentRouter.delete('/profile/field/:fieldName', async (req: AuthRequest, res) => {
  try {
    const { fieldName } = req.params;
    const allowedDeletions = ['department', 'college', 'phone', 'bio', 'avatarUrl'];

    if (!allowedDeletions.includes(fieldName)) {
      return res.status(400).json({
        success: false,
        message: `Field '${fieldName}' cannot be deleted. Only optional personal fields can be cleared.`,
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      { $unset: { [fieldName]: 1 } },
      { new: true }
    ).select('-passwordHash');

    return res.json({
      success: true,
      data: updated?.toJSON(),
      message: `Cleared ${fieldName} successfully`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
