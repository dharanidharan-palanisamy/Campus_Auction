import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  User,
  Category,
  AuctionListing,
  Bid,
  AutoBidLimit,
  AuctionOutcome,
  HandoverRecord,
  Question,
  SavedListing,
  SavedSearch,
  Notification,
  AuctionEvent,
  AuditLog,
  Dispute,
  AdminSetting,
} from '../models';
import { authenticateToken, AuthRequest, requireAdmin, generateToken } from '../middlewares/auth';

export const adminRouter = Router();

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================

// Dedicated Admin Login (Public endpoint)
adminRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Administrator account has been suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role,
    };

    const token = generateToken(userPayload);
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    await AuditLog.create({
      actorId: user._id,
      action: 'ADMIN_LOGIN',
      targetType: 'SYSTEM',
      targetId: user._id.toString(),
      payload: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });

    return res.json({ success: true, user: userPayload, token });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

// Admin Logout
adminRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.clearCookie('token');
  return res.json({ success: true, message: 'Administrator logged out successfully' });
});

// Admin Me
adminRouter.get('/auth/me', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  return res.json({ success: true, user: req.user });
});

// Protect all remaining admin routes
adminRouter.use(authenticateToken, requireAdmin);

// Admin Profile Details
adminRouter.get('/profile', async (req: AuthRequest, res) => {
  try {
    const admin = await User.findById(req.user!.id).select(
      'email fullName campusAlias studentId role isEmailVerified createdAt department college lastLogin'
    );

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Administrator not found' });
    }

    const [recentActions, totalActions] = await Promise.all([
      AuditLog.find({ actorId: new mongoose.Types.ObjectId(req.user!.id) })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      AuditLog.countDocuments({ actorId: new mongoose.Types.ObjectId(req.user!.id) }),
    ]);

    return res.json({
      success: true,
      data: {
        ...admin.toJSON(),
        recentActions: recentActions.map((a: any) => ({ ...a, id: a._id.toString() })),
        totalActions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update Admin Profile & Password
adminRouter.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const { fullName, campusAlias, currentPassword, newPassword } = req.body;
    const admin = await User.findById(req.user!.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Administrator not found' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match' });
      }
      admin.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (fullName) admin.fullName = fullName.trim();
    if (campusAlias) admin.campusAlias = campusAlias.trim();

    await admin.save();

    await AuditLog.create({
      actorId: admin._id,
      action: 'UPDATE_ADMIN_PROFILE',
      targetType: 'USER',
      targetId: admin._id.toString(),
      payload: { fullName: admin.fullName, campusAlias: admin.campusAlias },
    });

    return res.json({ success: true, message: 'Profile updated successfully', data: admin.toJSON() });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. DASHBOARD & OVERVIEW ANALYTICS
// ==========================================

adminRouter.get('/stats', async (req, res) => {
  try {
    const range = (req.query.range as string) || 'all';
    const now = new Date();
    let startDate: Date | undefined;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    } else if (range === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    } else if (range === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    }

    const dateFilter = startDate ? { createdAt: { $gte: startDate } } : {};
    const bidDateFilter = startDate ? { acceptedAt: { $gte: startDate } } : {};

    const [
      totalStudents,
      verifiedStudents,
      pendingVerification,
      suspendedStudents,
      totalListings,
      activeAuctions,
      scheduledAuctions,
      closingSoonAuctions,
      completedAuctions,
      unsoldAuctions,
      pendingDecisions,
      totalBids,
      openDisputes,
      categories,
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT', ...dateFilter }),
      User.countDocuments({ role: 'STUDENT', isEmailVerified: true, ...dateFilter }),
      User.countDocuments({ role: 'STUDENT', isEmailVerified: false, ...dateFilter }),
      User.countDocuments({ role: 'STUDENT', isSuspended: true, ...dateFilter }),
      AuctionListing.countDocuments(dateFilter),
      AuctionListing.countDocuments({ status: 'ACTIVE', closingTime: { $gt: now } }),
      AuctionListing.countDocuments({ status: 'SCHEDULED' }),
      AuctionListing.countDocuments({
        status: 'ACTIVE',
        closingTime: { $gt: now, $lte: new Date(now.getTime() + 3 * 3600 * 1000) },
      }),
      AuctionListing.countDocuments({ status: 'COMPLETED', ...dateFilter }),
      AuctionListing.countDocuments({ status: 'UNSOLD', ...dateFilter }),
      AuctionListing.countDocuments({ status: 'PENDING_SELLER_DECISION' }),
      Bid.countDocuments(bidDateFilter),
      Dispute.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION'] } }),
      Category.find().lean(),
    ]);

    // Volume calculation
    const volumeAgg = await AuctionListing.aggregate([
      { $match: { status: 'COMPLETED', ...dateFilter } },
      { $group: { _id: null, totalVolume: { $sum: '$currentLeadingBidInCents' } } },
    ]);
    const totalVolumeInCents = volumeAgg.length > 0 ? volumeAgg[0].totalVolume : 0;

    // Recent items
    const [recentStudents, recentListings, recentBids, recentAuditLogs] = await Promise.all([
      User.find({ role: 'STUDENT' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName campusAlias email studentId isEmailVerified isSuspended createdAt')
        .lean(),
      AuctionListing.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('category', 'name')
        .populate('seller', 'campusAlias')
        .lean(),
      Bid.find()
        .sort({ acceptedAt: -1 })
        .limit(5)
        .populate('bidder', 'campusAlias studentId')
        .populate('listing', 'title')
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('actor', 'campusAlias')
        .lean(),
    ]);

    // Compute category listing counts
    const catCounts = await AuctionListing.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const catCountMap = new Map<string, number>();
    catCounts.forEach((c: any) => catCountMap.set(c._id.toString(), c.count));

    const categoryDistribution = categories.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      count: catCountMap.get(c._id.toString()) || 0,
    }));

    const outcomeDistribution = [
      { name: 'Active', count: activeAuctions },
      { name: 'Completed', count: completedAuctions },
      { name: 'Unsold', count: unsoldAuctions },
      { name: 'Closing Soon', count: closingSoonAuctions },
    ];

    return res.json({
      success: true,
      data: {
        totalStudents,
        verifiedStudents,
        pendingVerification,
        suspendedStudents,
        totalListings,
        activeAuctions,
        scheduledAuctions,
        closingSoonAuctions,
        completedAuctions,
        unsoldAuctions,
        pendingDecisions,
        totalBids,
        totalVolumeInCents,
        openDisputes,
        categoryDistribution,
        outcomeDistribution,
        recentStudents: recentStudents.map((s: any) => ({ ...s, id: s._id.toString() })),
        recentListings: recentListings.map((l: any) => ({ ...l, id: l._id.toString() })),
        recentBids: recentBids.map((b: any) => ({ ...b, id: b._id.toString() })),
        recentAuditLogs: recentAuditLogs.map((a: any) => ({ ...a, id: a._id.toString() })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. STUDENT MANAGEMENT
// ==========================================

// 3.1 List Students with Search, Filters, Sorting & Pagination
adminRouter.get('/students', async (req, res) => {
  try {
    const {
      search = '',
      status = 'ALL',
      department = '',
      sort = 'newest',
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const filter: any = { role: 'STUDENT' };

    if (status === 'VERIFIED') {
      filter.isEmailVerified = true;
      filter.isSuspended = false;
    } else if (status === 'PENDING') {
      filter.isEmailVerified = false;
    } else if (status === 'SUSPENDED') {
      filter.isSuspended = true;
    }

    if (department) {
      filter.department = { $regex: department as string, $options: 'i' };
    }

    if (search) {
      const q = (search as string).trim();
      const reg = new RegExp(q, 'i');
      filter.$or = [
        { fullName: reg },
        { campusAlias: reg },
        { email: reg },
        { studentId: reg },
        { department: reg },
      ];
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name_asc') sortOption = { fullName: 1 };
    if (sort === 'name_desc') sortOption = { fullName: -1 };

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort(sortOption).skip(skip).limit(take).lean(),
    ]);

    const studentIds = students.map((s: any) => s._id);

    // Compute counts for listings, bids, outcomesWon
    const [listingCounts, bidCounts, wonCounts] = await Promise.all([
      AuctionListing.aggregate([
        { $match: { sellerId: { $in: studentIds } } },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
      ]),
      Bid.aggregate([
        { $match: { bidderId: { $in: studentIds } } },
        { $group: { _id: '$bidderId', count: { $sum: 1 } } },
      ]),
      AuctionOutcome.aggregate([
        { $match: { winnerId: { $in: studentIds } } },
        { $group: { _id: '$winnerId', count: { $sum: 1 } } },
      ]),
    ]);

    const listingMap = new Map<string, number>();
    listingCounts.forEach((c: any) => listingMap.set(c._id.toString(), c.count));

    const bidMap = new Map<string, number>();
    bidCounts.forEach((c: any) => bidMap.set(c._id.toString(), c.count));

    const wonMap = new Map<string, number>();
    wonCounts.forEach((c: any) => wonMap.set(c._id.toString(), c.count));

    const formatted = students.map((s: any) => {
      const idStr = s._id.toString();
      return {
        ...s,
        id: idStr,
        _count: {
          listings: listingMap.get(idStr) || 0,
          bids: bidMap.get(idStr) || 0,
          outcomesWon: wonMap.get(idStr) || 0,
        },
      };
    });

    return res.json({
      success: true,
      data: formatted,
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

// 3.2 Export Students CSV
adminRouter.get('/students/export', async (req, res) => {
  try {
    const { search = '', status = 'ALL', department = '' } = req.query;
    const filter: any = { role: 'STUDENT' };

    if (status === 'VERIFIED') {
      filter.isEmailVerified = true;
      filter.isSuspended = false;
    } else if (status === 'PENDING') {
      filter.isEmailVerified = false;
    } else if (status === 'SUSPENDED') {
      filter.isSuspended = true;
    }

    if (department) {
      filter.department = { $regex: department as string, $options: 'i' };
    }

    if (search) {
      const q = (search as string).trim();
      const reg = new RegExp(q, 'i');
      filter.$or = [{ fullName: reg }, { campusAlias: reg }, { email: reg }, { studentId: reg }];
    }

    const students = await User.find(filter).sort({ createdAt: -1 }).lean();
    const studentIds = students.map((s: any) => s._id);

    const [listingCounts, bidCounts, wonCounts] = await Promise.all([
      AuctionListing.aggregate([
        { $match: { sellerId: { $in: studentIds } } },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
      ]),
      Bid.aggregate([
        { $match: { bidderId: { $in: studentIds } } },
        { $group: { _id: '$bidderId', count: { $sum: 1 } } },
      ]),
      AuctionOutcome.aggregate([
        { $match: { winnerId: { $in: studentIds } } },
        { $group: { _id: '$winnerId', count: { $sum: 1 } } },
      ]),
    ]);

    const listingMap = new Map<string, number>();
    listingCounts.forEach((c: any) => listingMap.set(c._id.toString(), c.count));

    const bidMap = new Map<string, number>();
    bidCounts.forEach((c: any) => bidMap.set(c._id.toString(), c.count));

    const wonMap = new Map<string, number>();
    wonCounts.forEach((c: any) => wonMap.set(c._id.toString(), c.count));

    const csvRows = [
      [
        'Student ID',
        'Full Name',
        'Campus Alias',
        'Email',
        'Department',
        'College',
        'Verification Status',
        'Account Status',
        'Total Listings',
        'Total Bids',
        'Won Auctions',
        'Registered At',
      ],
    ];

    for (const s of students) {
      const idStr = s._id.toString();
      csvRows.push([
        s.studentId || '',
        `"${(s.fullName || '').replace(/"/g, '""')}"`,
        s.campusAlias || '',
        s.email,
        `"${(s.department || '').replace(/"/g, '""')}"`,
        `"${(s.college || '').replace(/"/g, '""')}"`,
        s.isEmailVerified ? 'VERIFIED' : 'PENDING',
        s.isSuspended ? 'SUSPENDED' : 'ACTIVE',
        (listingMap.get(idStr) || 0).toString(),
        (bidMap.get(idStr) || 0).toString(),
        (wonMap.get(idStr) || 0).toString(),
        s.createdAt ? new Date(s.createdAt).toISOString() : '',
      ]);
    }

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campus_students_export.csv"');
    return res.send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3.3 Get Single Student Profile & Activity Details
adminRouter.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentObjectId = new mongoose.Types.ObjectId(student._id);

    const [
      listings,
      bids,
      outcomesWon,
      disputesReported,
      disputesAgainst,
      auditLogs,
      counts,
    ] = await Promise.all([
      AuctionListing.find({ sellerId: studentObjectId })
        .sort({ createdAt: -1 })
        .populate('category', 'name')
        .lean(),
      Bid.find({ bidderId: studentObjectId })
        .sort({ acceptedAt: -1 })
        .limit(20)
        .populate('listing', 'id title status currentLeadingBidInCents')
        .lean(),
      AuctionOutcome.find({ winnerId: studentObjectId })
        .populate({
          path: 'listing',
          select: 'id title pickupLocation',
          populate: { path: 'seller', select: 'campusAlias email' },
        })
        .lean(),
      Dispute.find({ reporterId: studentObjectId })
        .sort({ createdAt: -1 })
        .populate('listing', 'id title')
        .lean(),
      Dispute.find({ reportedUserId: studentObjectId })
        .sort({ createdAt: -1 })
        .populate('reporter', 'campusAlias studentId')
        .lean(),
      AuditLog.find({
        $or: [{ targetId: student._id.toString() }, { actorId: studentObjectId }],
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('actor', 'campusAlias')
        .lean(),
      Promise.all([
        AuctionListing.countDocuments({ sellerId: studentObjectId }),
        Bid.countDocuments({ bidderId: studentObjectId }),
        Question.countDocuments({ askerId: studentObjectId }),
        AuctionOutcome.countDocuments({ winnerId: studentObjectId }),
      ]),
    ]);

    const formattedListings = listings.map((l: any) => ({
      ...l,
      id: l._id.toString(),
      images: (l.images || []).slice(0, 1),
      _count: { bids: 0 },
    }));

    return res.json({
      success: true,
      data: {
        ...student,
        id: student._id.toString(),
        listings: formattedListings,
        bids: bids.map((b: any) => ({ ...b, id: b._id.toString() })),
        outcomesWon: outcomesWon.map((o: any) => ({ ...o, id: o._id.toString() })),
        disputesReported: disputesReported.map((d: any) => ({ ...d, id: d._id.toString() })),
        disputesAgainst: disputesAgainst.map((d: any) => ({ ...d, id: d._id.toString() })),
        auditLogs: auditLogs.map((a: any) => ({ ...a, id: a._id.toString() })),
        _count: {
          listings: counts[0],
          bids: counts[1],
          questions: counts[2],
          outcomesWon: counts[3],
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3.4 Verify Student
adminRouter.patch('/students/:id/verify', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isEmailVerified: true,
        verificationStatus: 'VERIFIED',
        verificationNotes: notes || 'Verified by University Administrator',
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await Notification.create({
      userId: user._id,
      type: 'SYSTEM',
      title: 'Institutional Verification Approved',
      message: 'Your student account has been verified by the campus administrator. You have full access to create listings and place bids.',
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'VERIFY_STUDENT',
      targetType: 'USER',
      targetId: user._id.toString(),
      payload: { notes, studentId: user.studentId, alias: user.campusAlias },
    });

    return res.json({ success: true, data: user.toJSON(), message: 'Student account verified successfully' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.5 Reject Student Verification
adminRouter.patch('/students/:id/reject-verification', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isEmailVerified: false,
        verificationStatus: 'REJECTED',
        verificationNotes: `Verification rejected: ${reason.trim()}`,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await Notification.create({
      userId: user._id,
      type: 'SYSTEM',
      title: 'Student Verification Rejected',
      message: `Your verification request was rejected: ${reason.trim()}. Please review your student credentials or contact administration.`,
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'REJECT_VERIFICATION',
      targetType: 'USER',
      targetId: user._id.toString(),
      payload: { reason: reason.trim(), studentId: user.studentId },
    });

    return res.json({ success: true, data: user.toJSON(), message: 'Student verification rejected' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.6 Suspend Student
adminRouter.patch('/students/:id/suspend', async (req: AuthRequest, res) => {
  try {
    const { reason, durationDays } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required' });
    }

    let suspendedUntil: Date | null = null;
    if (durationDays && parseInt(durationDays, 10) > 0) {
      suspendedUntil = new Date(Date.now() + parseInt(durationDays, 10) * 24 * 3600 * 1000);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: true,
        accountStatus: 'SUSPENDED',
        suspensionReason: reason.trim(),
        suspendedUntil,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await Notification.create({
      userId: user._id,
      type: 'SYSTEM',
      title: 'Account Suspended',
      message: `Your account has been suspended by administration. Reason: ${reason.trim()}${
        suspendedUntil ? `. Duration: until ${suspendedUntil.toLocaleDateString()}` : '.'
      }`,
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'SUSPEND_STUDENT',
      targetType: 'USER',
      targetId: user._id.toString(),
      payload: { reason: reason.trim(), durationDays, studentId: user.studentId },
    });

    return res.json({ success: true, data: user.toJSON(), message: 'Student account suspended' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.7 Reactivate Student
adminRouter.patch('/students/:id/reactivate', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: false,
        accountStatus: 'ACTIVE',
        suspensionReason: null,
        suspendedUntil: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await Notification.create({
      userId: user._id,
      type: 'SYSTEM',
      title: 'Account Reactivated',
      message: 'Your campus account has been reactivated. You may resume participating in campus auctions.',
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'REACTIVATE_STUDENT',
      targetType: 'USER',
      targetId: user._id.toString(),
      payload: { reason: reason || 'Reactivated by admin', studentId: user.studentId },
    });

    return res.json({ success: true, data: user.toJSON(), message: 'Student account reactivated' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.8 Delete Student Account
adminRouter.delete('/students/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete an administrator account' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    await Promise.all([
      Notification.deleteMany({ userId: userObjectId }),
      SavedListing.deleteMany({ userId: userObjectId }),
      SavedSearch.deleteMany({ userId: userObjectId }),
      AutoBidLimit.deleteMany({ bidderId: userObjectId }),
      Question.deleteMany({ askerId: userObjectId }),
      Dispute.deleteMany({ $or: [{ reporterId: userObjectId }, { reportedUserId: userObjectId }] }),
      Bid.deleteMany({ bidderId: userObjectId }),
      AuctionListing.deleteMany({ sellerId: userObjectId }),
      User.findByIdAndDelete(userId),
    ]);

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'DELETE_STUDENT',
      targetType: 'USER',
      targetId: userId,
      payload: { email: targetUser.email, studentId: targetUser.studentId, alias: targetUser.campusAlias },
    });

    return res.json({
      success: true,
      message: `Student account for ${targetUser.fullName} has been permanently deleted`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compatibility routes for existing student list actions
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'STUDENT' })
      .sort({ createdAt: -1 })
      .select('email fullName campusAlias studentId role isEmailVerified isSuspended createdAt')
      .lean();

    const userIds = users.map((u: any) => u._id);
    const [listingCounts, bidCounts] = await Promise.all([
      AuctionListing.aggregate([
        { $match: { sellerId: { $in: userIds } } },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
      ]),
      Bid.aggregate([
        { $match: { bidderId: { $in: userIds } } },
        { $group: { _id: '$bidderId', count: { $sum: 1 } } },
      ]),
    ]);

    const listingMap = new Map<string, number>();
    listingCounts.forEach((c: any) => listingMap.set(c._id.toString(), c.count));

    const bidMap = new Map<string, number>();
    bidCounts.forEach((c: any) => bidMap.set(c._id.toString(), c.count));

    const formatted = users.map((u: any) => ({
      ...u,
      id: u._id.toString(),
      _count: {
        listings: listingMap.get(u._id.toString()) || 0,
        bids: bidMap.get(u._id.toString()) || 0,
      },
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/users/:id/verify', async (req: AuthRequest, res) => {
  const { isVerified } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isEmailVerified: Boolean(isVerified) },
    { new: true }
  );
  return res.json({ success: true, data: user?.toJSON() });
});

adminRouter.patch('/users/:id/status', async (req: AuthRequest, res) => {
  const { isSuspended } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isSuspended: Boolean(isSuspended) },
    { new: true }
  );
  return res.json({ success: true, data: user?.toJSON() });
});

adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  const userId = req.params.id;
  await User.findByIdAndDelete(userId);
  return res.json({ success: true, message: 'User deleted' });
});

// ==========================================
// 4. LISTINGS & AUCTION MANAGEMENT
// ==========================================

// 4.1 List Listings with Filters & Search
adminRouter.get('/listings', async (req, res) => {
  try {
    const {
      search = '',
      status = 'ALL',
      category = '',
      page = '1',
      limit = '12',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * take;

    const filter: any = {};
    if (status !== 'ALL') {
      filter.status = status;
    }
    if (category) {
      const cat = await Category.findOne({ slug: category as string });
      if (cat) {
        filter.categoryId = cat._id;
      }
    }
    if (search) {
      const q = (search as string).trim();
      const reg = new RegExp(q, 'i');
      filter.$or = [{ title: reg }, { description: reg }, { pickupLocation: reg }];
    }

    const [total, listings] = await Promise.all([
      AuctionListing.countDocuments(filter),
      AuctionListing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('category', 'id name slug')
        .populate('seller', 'id fullName campusAlias email studentId')
        .lean(),
    ]);

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

    const bidMap = new Map<string, number>();
    bidCounts.forEach((c: any) => bidMap.set(c._id.toString(), c.count));

    const qMap = new Map<string, number>();
    questionCounts.forEach((q: any) => qMap.set(q._id.toString(), q.count));

    const formatted = listings.map((l: any) => {
      const idStr = l._id.toString();
      return {
        ...l,
        id: idStr,
        images: (l.images || []).slice(0, 1),
        _count: {
          bids: bidMap.get(idStr) || 0,
          questions: qMap.get(idStr) || 0,
        },
      };
    });

    return res.json({
      success: true,
      data: formatted,
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

// 4.2 Single Listing Detail with Bids
adminRouter.get('/listings/:id', async (req, res) => {
  try {
    const listing = await AuctionListing.findById(req.params.id)
      .populate('category')
      .populate('seller', 'id fullName campusAlias email studentId')
      .lean();

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const [bids, questions, outcome, handover] = await Promise.all([
      Bid.find({ listingId: listing._id })
        .sort({ acceptedAt: -1 })
        .populate('bidder', 'id campusAlias studentId')
        .lean(),
      Question.find({ listingId: listing._id })
        .sort({ createdAt: -1 })
        .populate('asker', 'campusAlias')
        .lean(),
      AuctionOutcome.findOne({ listingId: listing._id }).lean(),
      HandoverRecord.findOne({ listingId: listing._id }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        ...listing,
        id: listing._id.toString(),
        bids: bids.map((b: any) => ({ ...b, id: b._id.toString() })),
        questions: questions.map((q: any) => ({ ...q, id: q._id.toString() })),
        outcome: outcome ? { ...outcome, id: outcome._id.toString() } : null,
        handover: handover ? { ...handover, id: handover._id.toString() } : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4.3 Moderate Listing (Approve, Reject, Cancel, Remove)
adminRouter.patch('/listings/:id/moderate', async (req: AuthRequest, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Target status is required' });
    }

    const listing = await AuctionListing.findById(req.params.id).populate('seller', 'id campusAlias');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const previousStatus = listing.status;
    listing.status = status;
    await listing.save();

    if (listing.sellerId) {
      await Notification.create({
        userId: listing.sellerId,
        type: 'SYSTEM',
        title: `Auction Listing ${status}`,
        message: `Your listing "${listing.title}" has been updated to ${status} by administration${
          reason ? `: ${reason}` : '.'
        }`,
      });
    }

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'MODERATE_LISTING',
      targetType: 'AUCTION_LISTING',
      targetId: listing._id.toString(),
      payload: { previousStatus, newStatus: status, reason },
    });

    return res.json({ success: true, data: listing.toJSON(), message: `Listing updated to ${status}` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 4.4 Delete Listing
adminRouter.delete('/listings/:id', async (req: AuthRequest, res) => {
  try {
    const listingId = req.params.id;
    const listing = await AuctionListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    await Promise.all([
      SavedListing.deleteMany({ listingId: listing._id }),
      Bid.deleteMany({ listingId: listing._id }),
      Question.deleteMany({ listingId: listing._id }),
      AutoBidLimit.deleteMany({ listingId: listing._id }),
      AuctionOutcome.deleteMany({ listingId: listing._id }),
      HandoverRecord.deleteMany({ listingId: listing._id }),
      AuctionListing.findByIdAndDelete(listing._id),
    ]);

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'DELETE_LISTING',
      targetType: 'AUCTION_LISTING',
      targetId: listingId,
      payload: { title: listing.title },
    });

    return res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4.5 Auction Monitor List
adminRouter.get('/auctions', async (req, res) => {
  try {
    const { status = 'ALL', search = '', page = '1', limit = '15' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
    const skip = (pageNum - 1) * take;

    const now = new Date();
    const filter: any = {};

    if (status === 'LIVE') {
      filter.status = 'ACTIVE';
      filter.closingTime = { $gt: now };
    } else if (status === 'CLOSING_SOON') {
      filter.status = 'ACTIVE';
      filter.closingTime = { $gt: now, $lte: new Date(now.getTime() + 3 * 3600 * 1000) };
    } else if (status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      const reg = new RegExp((search as string).trim(), 'i');
      filter.title = reg;
    }

    const [total, auctions] = await Promise.all([
      AuctionListing.countDocuments(filter),
      AuctionListing.find(filter)
        .sort({ closingTime: 1 })
        .skip(skip)
        .limit(take)
        .populate('seller', 'campusAlias email')
        .populate('category', 'name')
        .lean(),
    ]);

    const listingIds = auctions.map((a: any) => a._id);
    const [bidCounts, latestBids] = await Promise.all([
      Bid.aggregate([
        { $match: { listingId: { $in: listingIds } } },
        { $group: { _id: '$listingId', count: { $sum: 1 } } },
      ]),
      Bid.find({ listingId: { $in: listingIds } })
        .sort({ acceptedAt: -1 })
        .populate('bidder', 'campusAlias')
        .lean(),
    ]);

    const bidCountMap = new Map<string, number>();
    bidCounts.forEach((c: any) => bidCountMap.set(c._id.toString(), c.count));

    const latestBidMap = new Map<string, any>();
    latestBids.forEach((b: any) => {
      const lid = b.listingId.toString();
      if (!latestBidMap.has(lid)) {
        latestBidMap.set(lid, b);
      }
    });

    const formatted = auctions.map((a: any) => {
      const idStr = a._id.toString();
      const topBid = latestBidMap.get(idStr);
      return {
        ...a,
        id: idStr,
        bids: topBid ? [{ ...topBid, id: topBid._id.toString() }] : [],
        _count: { bids: bidCountMap.get(idStr) || 0 },
      };
    });

    return res.json({
      success: true,
      data: formatted,
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

// 4.6 Auction Events Timeline
adminRouter.get('/auctions/:id/events', async (req, res) => {
  try {
    const listingObjectId = new mongoose.Types.ObjectId(req.params.id);
    const [events, bids] = await Promise.all([
      AuctionEvent.find({ listingId: listingObjectId }).sort({ createdAt: -1 }).lean(),
      Bid.find({ listingId: listingObjectId })
        .sort({ acceptedAt: -1 })
        .populate('bidder', 'campusAlias studentId')
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        events: events.map((e: any) => ({ ...e, id: e._id.toString() })),
        bids: bids.map((b: any) => ({ ...b, id: b._id.toString() })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. BID MONITORING
// ==========================================

adminRouter.get('/bids', async (req, res) => {
  try {
    const { search = '', listingId, bidderId, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const filter: any = {};
    if (listingId && mongoose.Types.ObjectId.isValid(listingId as string)) {
      filter.listingId = new mongoose.Types.ObjectId(listingId as string);
    }
    if (bidderId && mongoose.Types.ObjectId.isValid(bidderId as string)) {
      filter.bidderId = new mongoose.Types.ObjectId(bidderId as string);
    }

    const [total, bids] = await Promise.all([
      Bid.countDocuments(filter),
      Bid.find(filter)
        .sort({ acceptedAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('bidder', 'id fullName campusAlias studentId email')
        .populate('listing', 'id title status currentLeadingBidInCents')
        .lean(),
    ]);

    return res.json({
      success: true,
      data: bids.map((b: any) => ({ ...b, id: b._id.toString() })),
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

// ==========================================
// 6. CATEGORY MANAGEMENT
// ==========================================

adminRouter.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    const counts = await AuctionListing.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>();
    counts.forEach((c: any) => countMap.set(c._id.toString(), c.count));

    const formatted = categories.map((cat: any) => ({
      ...cat,
      id: cat._id.toString(),
      _count: { listings: countMap.get(cat._id.toString()) || 0 },
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, icon } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Name and slug are required' });
    }

    const existing = await Category.findOne({
      $or: [{ name: name.trim() }, { slug: slug.trim().toLowerCase() }],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category name or slug already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || null,
      icon: icon || 'Tag',
      isActive: true,
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'CREATE_CATEGORY',
      targetType: 'CATEGORY',
      targetId: category._id.toString(),
      payload: category.toJSON(),
    });

    return res.status(201).json({ success: true, data: category.toJSON() });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, icon } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name?.trim(),
        slug: slug?.trim().toLowerCase(),
        description: description?.trim(),
        icon,
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'UPDATE_CATEGORY',
      targetType: 'CATEGORY',
      targetId: category._id.toString(),
      payload: { name, slug },
    });

    return res.json({ success: true, data: category.toJSON() });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const attachedCount = await AuctionListing.countDocuments({ categoryId: category._id });
    if (attachedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}" because ${attachedCount} listing(s) are currently attached to it.`,
      });
    }

    await Category.findByIdAndDelete(category._id);

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'DELETE_CATEGORY',
      targetType: 'CATEGORY',
      targetId: category._id.toString(),
      payload: { name: category.name },
    });

    return res.json({ success: true, message: `Category "${category.name}" deleted successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 7. DISPUTE & REPORT MANAGEMENT
// ==========================================

adminRouter.get('/disputes', async (req, res) => {
  try {
    const { status = 'ALL', priority = 'ALL', search = '', page = '1', limit = '15' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
    const skip = (pageNum - 1) * take;

    const filter: any = {};
    if (status !== 'ALL') filter.status = status;
    if (priority !== 'ALL') filter.priority = priority;
    if (search) {
      const reg = new RegExp((search as string).trim(), 'i');
      filter.$or = [{ description: reg }, { category: reg }];
    }

    const [total, disputes] = await Promise.all([
      Dispute.countDocuments(filter),
      Dispute.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('reporter', 'id fullName campusAlias email studentId')
        .populate('reportedUser', 'id fullName campusAlias email studentId')
        .populate('listing', 'id title status currentLeadingBidInCents')
        .populate('assignedAdmin', 'id campusAlias')
        .lean(),
    ]);

    return res.json({
      success: true,
      data: disputes.map((d: any) => ({ ...d, id: d._id.toString() })),
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

adminRouter.get('/disputes/:id', async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('reporter', 'id fullName campusAlias email studentId')
      .populate('reportedUser', 'id fullName campusAlias email studentId')
      .populate({
        path: 'listing',
        populate: { path: 'seller', select: 'campusAlias' },
      })
      .populate('assignedAdmin', 'id campusAlias')
      .lean();

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    return res.json({ success: true, data: { ...dispute, id: dispute._id.toString() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/disputes/:id', async (req: AuthRequest, res) => {
  try {
    const { status, priority, assignedAdminId, internalNotes, resolutionReason } = req.body;

    const existing = await Dispute.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    if (status !== undefined) existing.status = status;
    if (priority !== undefined) existing.priority = priority;
    if (assignedAdminId !== undefined) {
      existing.assignedAdminId = assignedAdminId ? new mongoose.Types.ObjectId(assignedAdminId) : undefined;
    }
    if (internalNotes !== undefined) existing.internalNotes = internalNotes;
    if (resolutionReason !== undefined) existing.resolutionReason = resolutionReason;
    if (status === 'RESOLVED' || status === 'REJECTED') {
      existing.resolvedAt = new Date();
    }

    await existing.save();

    if (status && status !== existing.status) {
      await Notification.create({
        userId: existing.reporterId,
        type: 'SYSTEM',
        title: `Dispute Report ${status}`,
        message: `Your dispute report is now marked as ${status}.${
          resolutionReason ? ` Resolution notes: ${resolutionReason}` : ''
        }`,
      });
    }

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'UPDATE_DISPUTE',
      targetType: 'DISPUTE',
      targetId: existing._id.toString(),
      payload: { previousStatus: existing.status, newStatus: status, resolutionReason },
    });

    return res.json({ success: true, data: existing.toJSON(), message: 'Dispute updated successfully' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. NOTIFICATION MANAGEMENT
// ==========================================

adminRouter.get('/notifications', async (req, res) => {
  try {
    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'fullName campusAlias email')
        .lean(),
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
    ]);

    const formatted = notifications.map((n: any) => ({
      ...n,
      id: n._id.toString(),
      user: n.userId,
    }));

    return res.json({
      success: true,
      data: {
        notifications: formatted,
        totalCount,
        unreadCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.post('/notifications', async (req: AuthRequest, res) => {
  try {
    const { target, targetUserId, title, message, type = 'ANNOUNCEMENT' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let targetUsers: any[] = [];

    if (target === 'INDIVIDUAL' && targetUserId) {
      targetUsers = [{ _id: new mongoose.Types.ObjectId(targetUserId) }];
    } else if (target === 'VERIFIED_STUDENTS') {
      targetUsers = await User.find({ role: 'STUDENT', isEmailVerified: true, isSuspended: false }).select('_id');
    } else if (target === 'SUSPENDED_STUDENTS') {
      targetUsers = await User.find({ role: 'STUDENT', isSuspended: true }).select('_id');
    } else {
      targetUsers = await User.find({ role: 'STUDENT' }).select('_id');
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'No target students matched this criteria' });
    }

    const docs = targetUsers.map((u: any) => ({
      userId: u._id,
      type,
      title: title.trim(),
      message: message.trim(),
      metadata: { senderAdmin: req.user!.campusAlias, sentAt: new Date() },
    }));

    await Notification.insertMany(docs);

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'BROADCAST_NOTIFICATION',
      targetType: 'NOTIFICATION',
      payload: { title, target, recipientCount: targetUsers.length },
    });

    return res.status(201).json({
      success: true,
      message: `Notification successfully sent to ${targetUsers.length} student(s)`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 9. REPORTS & ANALYTICS
// ==========================================

adminRouter.get('/reports/overview', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const now = new Date();
    let startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    if (range === 'all') startDate = new Date(2020, 0, 1);

    const [
      studentsCount,
      verifiedCount,
      listingsCount,
      completedCount,
      unsoldCount,
      bidsCount,
      disputesCount,
      topSellersAgg,
      topBiddersAgg,
      completedListings,
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT', createdAt: { $gte: startDate } }),
      User.countDocuments({ role: 'STUDENT', isEmailVerified: true, createdAt: { $gte: startDate } }),
      AuctionListing.countDocuments({ createdAt: { $gte: startDate } }),
      AuctionListing.countDocuments({ status: 'COMPLETED', createdAt: { $gte: startDate } }),
      AuctionListing.countDocuments({ status: 'UNSOLD', createdAt: { $gte: startDate } }),
      Bid.countDocuments({ acceptedAt: { $gte: startDate } }),
      Dispute.countDocuments({ createdAt: { $gte: startDate } }),
      AuctionListing.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Bid.aggregate([
        { $match: { acceptedAt: { $gte: startDate } } },
        { $group: { _id: '$bidderId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      AuctionListing.find({ status: 'COMPLETED', createdAt: { $gte: startDate } }).select(
        'currentLeadingBidInCents'
      ),
    ]);

    const sellerUserIds = topSellersAgg.map((s: any) => s._id);
    const bidderUserIds = topBiddersAgg.map((b: any) => b._id);

    const [sellerUsers, bidderUsers] = await Promise.all([
      User.find({ _id: { $in: sellerUserIds } }).select('fullName campusAlias studentId').lean(),
      User.find({ _id: { $in: bidderUserIds } }).select('fullName campusAlias studentId').lean(),
    ]);

    const sMap = new Map<string, any>();
    sellerUsers.forEach((u: any) => sMap.set(u._id.toString(), u));

    const bMap = new Map<string, any>();
    bidderUsers.forEach((u: any) => bMap.set(u._id.toString(), u));

    const topSellers = topSellersAgg.map((s: any) => {
      const u = sMap.get(s._id.toString()) || {};
      return {
        id: s._id.toString(),
        fullName: u.fullName || 'Student',
        campusAlias: u.campusAlias || 'Student',
        studentId: u.studentId,
        _count: { listings: s.count },
      };
    });

    const topBidders = topBiddersAgg.map((b: any) => {
      const u = bMap.get(b._id.toString()) || {};
      return {
        id: b._id.toString(),
        fullName: u.fullName || 'Student',
        campusAlias: u.campusAlias || 'Student',
        studentId: u.studentId,
        _count: { bids: b.count },
      };
    });

    const totalVolumeInCents = completedListings.reduce((acc, curr) => acc + curr.currentLeadingBidInCents, 0);

    return res.json({
      success: true,
      data: {
        range,
        studentsCount,
        verifiedCount,
        listingsCount,
        completedCount,
        unsoldCount,
        bidsCount,
        disputesCount,
        totalVolumeInCents,
        topSellers,
        topBidders,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.get('/reports/export', async (req, res) => {
  try {
    const { type = 'auctions' } = req.query;

    if (type === 'auctions') {
      const items = await AuctionListing.find()
        .sort({ createdAt: -1 })
        .populate('category', 'name')
        .populate('seller', 'campusAlias studentId')
        .lean();

      const listingIds = items.map((i: any) => i._id);
      const bidCounts = await Bid.aggregate([
        { $match: { listingId: { $in: listingIds } } },
        { $group: { _id: '$listingId', count: { $sum: 1 } } },
      ]);
      const bMap = new Map<string, number>();
      bidCounts.forEach((c: any) => bMap.set(c._id.toString(), c.count));

      const csvRows = [
        [
          'ID',
          'Title',
          'Category',
          'Seller Alias',
          'Starting Price (INR)',
          'Final/Leading Bid (INR)',
          'Bids Count',
          'Status',
          'Closing Time',
          'Created At',
        ],
      ];
      for (const item of items as any) {
        csvRows.push([
          item._id.toString(),
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${item.category?.name || 'General'}"`,
          item.seller?.campusAlias || 'Seller',
          (item.startingPriceInCents / 100).toFixed(2),
          (item.currentLeadingBidInCents / 100).toFixed(2),
          (bMap.get(item._id.toString()) || 0).toString(),
          item.status,
          item.closingTime ? new Date(item.closingTime).toISOString() : '',
          item.createdAt ? new Date(item.createdAt).toISOString() : '',
        ]);
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="auctions_report.csv"');
      return res.send(csvRows.map((r) => r.join(',')).join('\n'));
    }

    if (type === 'bids') {
      const items = await Bid.find()
        .sort({ acceptedAt: -1 })
        .populate('bidder', 'campusAlias studentId')
        .populate('listing', 'title')
        .lean();

      const csvRows = [['Bid ID', 'Auction Title', 'Bidder Alias', 'Student ID', 'Amount (INR)', 'Accepted At']];
      for (const b of items as any) {
        csvRows.push([
          b._id.toString(),
          `"${(b.listing?.title || '').replace(/"/g, '""')}"`,
          b.bidder?.campusAlias || 'Student',
          b.bidder?.studentId || '',
          (b.amountInCents / 100).toFixed(2),
          b.acceptedAt ? new Date(b.acceptedAt).toISOString() : '',
        ]);
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bids_report.csv"');
      return res.send(csvRows.map((r) => r.join(',')).join('\n'));
    }

    return res.status(400).json({ success: false, message: 'Invalid export type' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 10. AUDIT LOGS
// ==========================================

adminRouter.get('/audit-logs', async (req, res) => {
  try {
    const { search = '', action = '', targetType = '', page = '1', limit = '25' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * take;

    const filter: any = {};
    if (action) filter.action = action as string;
    if (targetType) filter.targetType = targetType as string;
    if (search) {
      const reg = new RegExp((search as string).trim(), 'i');
      filter.$or = [{ action: reg }, { targetType: reg }];
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('actor', 'id campusAlias email')
        .lean(),
    ]);

    return res.json({
      success: true,
      data: logs.map((l: any) => ({ ...l, id: l._id.toString() })),
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

adminRouter.get('/audit-logs/export', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500).populate('actor', 'campusAlias').lean();

    const csvRows = [['ID', 'Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID', 'Details']];
    for (const log of logs as any) {
      csvRows.push([
        log._id.toString(),
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
        log.actor?.campusAlias || 'System',
        log.action,
        log.targetType || '',
        log.targetId || '',
        `"${JSON.stringify(log.payload || '').replace(/"/g, '""')}"`,
      ]);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campus_audit_logs.csv"');
    return res.send(csvRows.map((r) => r.join(',')).join('\n'));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 11. SYSTEM SETTINGS
// ==========================================

adminRouter.get('/settings', async (req, res) => {
  try {
    const settingsList = await AdminSetting.find().lean();
    const settingsMap: { [key: string]: any } = {};
    for (const s of settingsList) {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    }
    return res.json({ success: true, data: settingsMap });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/settings', async (req: AuthRequest, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object is required' });
    }

    const updatedKeys: string[] = [];
    for (const [key, value] of Object.entries(settings)) {
      await AdminSetting.findOneAndUpdate(
        { key },
        {
          key,
          value: JSON.stringify(value),
          updatedBy: req.user!.id,
        },
        { upsert: true, new: true }
      );
      updatedKeys.push(key);
    }

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(req.user!.id),
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetType: 'SYSTEM_SETTINGS',
      payload: { updatedKeys },
    });

    return res.json({ success: true, message: 'Settings saved successfully', updatedKeys });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
