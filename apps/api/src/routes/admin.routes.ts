import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
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

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

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

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      campusAlias: user.campusAlias,
      studentId: user.studentId,
      role: user.role
    };

    const token = generateToken(userPayload);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'ADMIN_LOGIN',
        targetType: 'SYSTEM',
        targetId: user.id,
        payload: JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] })
      }
    });

    return res.json({ success: true, user: userPayload, token });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

// Admin Logout
adminRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Administrator logged out successfully' });
});

// Admin Me
adminRouter.get('/auth/me', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  return res.json({ success: true, user: req.user });
});

// Protect all remaining admin routes
adminRouter.use(authenticateToken, requireAdmin);

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

    const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};
    const bidDateFilter = startDate ? { acceptedAt: { gte: startDate } } : {};

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
      categories
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', ...dateFilter } }),
      prisma.user.count({ where: { role: 'STUDENT', isEmailVerified: true, ...dateFilter } }),
      prisma.user.count({ where: { role: 'STUDENT', isEmailVerified: false, ...dateFilter } }),
      prisma.user.count({ where: { role: 'STUDENT', isSuspended: true, ...dateFilter } }),
      prisma.auctionListing.count({ where: dateFilter }),
      prisma.auctionListing.count({ where: { status: 'ACTIVE', closingTime: { gt: now } } }),
      prisma.auctionListing.count({ where: { status: 'SCHEDULED' } }),
      prisma.auctionListing.count({
        where: {
          status: 'ACTIVE',
          closingTime: {
            gt: now,
            lte: new Date(now.getTime() + 3 * 3600 * 1000)
          }
        }
      }),
      prisma.auctionListing.count({ where: { status: 'COMPLETED', ...dateFilter } }),
      prisma.auctionListing.count({ where: { status: 'UNSOLD', ...dateFilter } }),
      prisma.auctionListing.count({ where: { status: 'PENDING_SELLER_DECISION' } }),
      prisma.bid.count({ where: bidDateFilter }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION'] } } }),
      prisma.category.findMany({
        include: {
          _count: { select: { listings: true } }
        }
      })
    ]);

    // Volume calculation
    const completedListings = await prisma.auctionListing.findMany({
      where: { status: 'COMPLETED', ...dateFilter },
      select: { currentLeadingBidInCents: true }
    });
    const totalVolumeInCents = completedListings.reduce((acc, curr) => acc + curr.currentLeadingBidInCents, 0);

    // Recent items
    const [recentStudents, recentListings, recentBids, recentAuditLogs] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          campusAlias: true,
          email: true,
          studentId: true,
          isEmailVerified: true,
          isSuspended: true,
          createdAt: true
        }
      }),
      prisma.auctionListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          category: { select: { name: true } },
          seller: { select: { campusAlias: true } }
        }
      }),
      prisma.bid.findMany({
        orderBy: { acceptedAt: 'desc' },
        take: 5,
        include: {
          bidder: { select: { campusAlias: true, studentId: true } },
          listing: { select: { id: true, title: true } }
        }
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          actor: { select: { campusAlias: true } }
        }
      })
    ]);

    // Chart distribution: category-wise
    const categoryDistribution = categories.map(c => ({
      name: c.name,
      slug: c.slug,
      count: c._count.listings
    }));

    // Chart distribution: outcomes
    const outcomeDistribution = [
      { name: 'Active', count: activeAuctions },
      { name: 'Completed', count: completedAuctions },
      { name: 'Unsold', count: unsoldAuctions },
      { name: 'Closing Soon', count: closingSoonAuctions }
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
        recentStudents,
        recentListings,
        recentBids,
        recentAuditLogs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. STUDENT MANAGEMENT (HIGHEST PRIORITY)
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
      limit = '10'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = { role: 'STUDENT' };

    if (status === 'VERIFIED') {
      where.isEmailVerified = true;
      where.isSuspended = false;
    } else if (status === 'PENDING') {
      where.isEmailVerified = false;
    } else if (status === 'SUSPENDED') {
      where.isSuspended = true;
    }

    if (department) {
      where.department = { contains: department as string };
    }

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { fullName: { contains: q } },
        { campusAlias: { contains: q } },
        { email: { contains: q } },
        { studentId: { contains: q } },
        { department: { contains: q } }
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'name_asc') orderBy = { fullName: 'asc' };
    if (sort === 'name_desc') orderBy = { fullName: 'desc' };

    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        take,
        skip,
        orderBy,
        select: {
          id: true,
          email: true,
          fullName: true,
          campusAlias: true,
          studentId: true,
          department: true,
          college: true,
          avatarUrl: true,
          role: true,
          isEmailVerified: true,
          verificationNotes: true,
          isSuspended: true,
          suspensionReason: true,
          suspendedUntil: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              listings: true,
              bids: true,
              outcomesWon: true
            }
          }
        }
      })
    ]);

    return res.json({
      success: true,
      data: students,
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

// 3.2 Export Students CSV
adminRouter.get('/students/export', async (req, res) => {
  try {
    const { search = '', status = 'ALL', department = '' } = req.query;
    const where: any = { role: 'STUDENT' };

    if (status === 'VERIFIED') {
      where.isEmailVerified = true;
      where.isSuspended = false;
    } else if (status === 'PENDING') {
      where.isEmailVerified = false;
    } else if (status === 'SUSPENDED') {
      where.isSuspended = true;
    }

    if (department) {
      where.department = { contains: department as string };
    }

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { fullName: { contains: q } },
        { campusAlias: { contains: q } },
        { email: { contains: q } },
        { studentId: { contains: q } }
      ];
    }

    const students = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        studentId: true,
        fullName: true,
        campusAlias: true,
        email: true,
        department: true,
        college: true,
        isEmailVerified: true,
        isSuspended: true,
        suspensionReason: true,
        createdAt: true,
        lastLogin: true,
        _count: { select: { listings: true, bids: true, outcomesWon: true } }
      }
    });

    const csvRows = [
      ['Student ID', 'Full Name', 'Campus Alias', 'Email', 'Department', 'College', 'Verification Status', 'Account Status', 'Total Listings', 'Total Bids', 'Won Auctions', 'Registered At']
    ];

    for (const s of students) {
      csvRows.push([
        s.studentId,
        `"${s.fullName.replace(/"/g, '""')}"`,
        s.campusAlias,
        s.email,
        `"${(s.department || '').replace(/"/g, '""')}"`,
        `"${(s.college || '').replace(/"/g, '""')}"`,
        s.isEmailVerified ? 'VERIFIED' : 'PENDING',
        s.isSuspended ? 'SUSPENDED' : 'ACTIVE',
        s._count.listings.toString(),
        s._count.bids.toString(),
        s._count.outcomesWon.toString(),
        s.createdAt.toISOString()
      ]);
    }

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
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
    const student = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { name: true } },
            images: { take: 1, orderBy: { displayOrder: 'asc' } },
            _count: { select: { bids: true } }
          }
        },
        bids: {
          orderBy: { acceptedAt: 'desc' },
          take: 20,
          include: {
            listing: { select: { id: true, title: true, status: true, currentLeadingBidInCents: true } }
          }
        },
        outcomesWon: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                pickupLocation: true,
                seller: { select: { campusAlias: true, email: true } }
              }
            }
          }
        },
        disputesReported: {
          orderBy: { createdAt: 'desc' },
          include: {
            listing: { select: { id: true, title: true } }
          }
        },
        disputesAgainst: {
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: { select: { campusAlias: true, studentId: true } }
          }
        },
        _count: {
          select: {
            listings: true,
            bids: true,
            questions: true,
            outcomesWon: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Associated audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { targetId: student.id },
          { actorId: student.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: { select: { campusAlias: true } } }
    });

    return res.json({
      success: true,
      data: {
        ...student,
        auditLogs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3.4 Verify Student
adminRouter.patch('/students/:id/verify', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isEmailVerified: true,
        verificationNotes: notes || 'Verified by University Administrator'
      }
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Institutional Verification Approved',
        message: 'Your student account has been verified by the campus administrator. You have full access to create listings and place bids.'
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'VERIFY_STUDENT',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ notes, studentId: user.studentId, alias: user.campusAlias })
      }
    });

    return res.json({ success: true, data: user, message: 'Student account verified successfully' });
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

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isEmailVerified: false,
        verificationNotes: `Verification rejected: ${reason.trim()}`
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Student Verification Rejected',
        message: `Your verification request was rejected: ${reason.trim()}. Please review your student credentials or contact administration.`
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'REJECT_VERIFICATION',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ reason: reason.trim(), studentId: user.studentId })
      }
    });

    return res.json({ success: true, data: user, message: 'Student verification rejected' });
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

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isSuspended: true,
        suspensionReason: reason.trim(),
        suspendedUntil
      }
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Account Suspended',
        message: `Your account has been suspended by administration. Reason: ${reason.trim()}${suspendedUntil ? `. Duration: until ${suspendedUntil.toLocaleDateString()}` : '.'}`
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'SUSPEND_STUDENT',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ reason: reason.trim(), durationDays, studentId: user.studentId })
      }
    });

    return res.json({ success: true, data: user, message: 'Student account suspended' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.7 Reactivate Student
adminRouter.patch('/students/:id/reactivate', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isSuspended: false,
        suspensionReason: null,
        suspendedUntil: null
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Account Reactivated',
        message: 'Your campus account has been reactivated. You may resume participating in campus auctions.'
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'REACTIVATE_STUDENT',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ reason: reason || 'Reactivated by admin', studentId: user.studentId })
      }
    });

    return res.json({ success: true, data: user, message: 'Student account reactivated' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3.8 Delete Student Account
adminRouter.delete('/students/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete an administrator account' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.savedListing.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.autoBidLimit.deleteMany({ where: { bidderId: userId } });
      await tx.questionAnswer.deleteMany({ where: { sellerId: userId } });
      await tx.question.deleteMany({ where: { askerId: userId } });
      await tx.dispute.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] } });
      await tx.bid.deleteMany({ where: { bidderId: userId } });
      await tx.auctionListing.deleteMany({ where: { sellerId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'DELETE_STUDENT',
        targetType: 'USER',
        targetId: userId,
        payload: JSON.stringify({ email: targetUser.email, studentId: targetUser.studentId, alias: targetUser.campusAlias })
      }
    });

    return res.json({ success: true, message: `Student account for ${targetUser.fullName} has been permanently deleted` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compatibility routes for existing student list actions
adminRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      campusAlias: true,
      studentId: true,
      role: true,
      isEmailVerified: true,
      isSuspended: true,
      createdAt: true,
      _count: { select: { listings: true, bids: true } },
    },
  });
  return res.json({ success: true, data: users });
});
adminRouter.patch('/users/:id/verify', async (req: AuthRequest, res) => {
  const { isVerified } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isEmailVerified: Boolean(isVerified) },
  });
  return res.json({ success: true, data: user });
});
adminRouter.patch('/users/:id/status', async (req: AuthRequest, res) => {
  const { isSuspended } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isSuspended: Boolean(isSuspended) },
  });
  return res.json({ success: true, data: user });
});
adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  const userId = req.params.id;
  await prisma.user.delete({ where: { id: userId } });
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
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }
    if (category) {
      where.category = { slug: category as string };
    }
    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { pickupLocation: { contains: q } },
        { seller: { campusAlias: { contains: q } } }
      ];
    }

    const [total, listings] = await Promise.all([
      prisma.auctionListing.count({ where }),
      prisma.auctionListing.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
          images: { take: 1, orderBy: { displayOrder: 'asc' } },
          _count: { select: { bids: true, questions: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      data: listings,
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

// 4.2 Single Listing Detail with Bids
adminRouter.get('/listings/:id', async (req, res) => {
  try {
    const listing = await prisma.auctionListing.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        seller: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        bids: {
          orderBy: { acceptedAt: 'desc' },
          include: { bidder: { select: { id: true, campusAlias: true, studentId: true } } }
        },
        questions: {
          orderBy: { createdAt: 'desc' },
          include: {
            asker: { select: { campusAlias: true } },
            answers: true
          }
        },
        outcome: true,
        handover: true
      }
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    return res.json({ success: true, data: listing });
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

    const listing = await prisma.auctionListing.findUnique({
      where: { id: req.params.id },
      include: { seller: { select: { id: true, campusAlias: true } } }
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const updated = await prisma.auctionListing.update({
      where: { id: req.params.id },
      data: { status }
    });

    // Notify seller
    if (listing.seller) {
      await prisma.notification.create({
        data: {
          userId: listing.seller.id,
          type: 'SYSTEM',
          title: `Auction Listing ${status}`,
          message: `Your listing "${listing.title}" has been updated to ${status} by administration${reason ? `: ${reason}` : '.'}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'MODERATE_LISTING',
        targetType: 'AUCTION_LISTING',
        targetId: listing.id,
        payload: JSON.stringify({ previousStatus: listing.status, newStatus: status, reason })
      }
    });

    return res.json({ success: true, data: updated, message: `Listing updated to ${status}` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 4.4 Delete Listing
adminRouter.delete('/listings/:id', async (req: AuthRequest, res) => {
  try {
    const listingId = req.params.id;
    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    await prisma.savedListing.deleteMany({ where: { listingId } });
    await prisma.auctionListing.delete({ where: { id: listingId } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'DELETE_LISTING',
        targetType: 'AUCTION_LISTING',
        targetId: listingId,
        payload: JSON.stringify({ title: listing.title })
      }
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
    const where: any = {};

    if (status === 'LIVE') {
      where.status = 'ACTIVE';
      where.closingTime = { gt: now };
    } else if (status === 'CLOSING_SOON') {
      where.status = 'ACTIVE';
      where.closingTime = { gt: now, lte: new Date(now.getTime() + 3 * 3600 * 1000) };
    } else if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { seller: { campusAlias: { contains: search as string } } }
      ];
    }

    const [total, auctions] = await Promise.all([
      prisma.auctionListing.count({ where }),
      prisma.auctionListing.findMany({
        where,
        take,
        skip,
        orderBy: { closingTime: 'asc' },
        include: {
          seller: { select: { campusAlias: true, email: true } },
          category: { select: { name: true } },
          bids: {
            orderBy: { acceptedAt: 'desc' },
            take: 1,
            include: { bidder: { select: { campusAlias: true } } }
          },
          _count: { select: { bids: true } }
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

// 4.6 Auction Events Timeline
adminRouter.get('/auctions/:id/events', async (req, res) => {
  try {
    const [events, bids] = await Promise.all([
      prisma.auctionEvent.findMany({
        where: { listingId: req.params.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bid.findMany({
        where: { listingId: req.params.id },
        orderBy: { acceptedAt: 'desc' },
        include: { bidder: { select: { campusAlias: true, studentId: true } } }
      })
    ]);

    return res.json({ success: true, data: { events, bids } });
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

    const where: any = {};
    if (listingId) where.listingId = listingId as string;
    if (bidderId) where.bidderId = bidderId as string;

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { bidder: { campusAlias: { contains: q } } },
        { bidder: { studentId: { contains: q } } },
        { listing: { title: { contains: q } } }
      ];
    }

    const [total, bids] = await Promise.all([
      prisma.bid.count({ where }),
      prisma.bid.findMany({
        where,
        take,
        skip,
        orderBy: { acceptedAt: 'desc' },
        include: {
          bidder: { select: { id: true, fullName: true, campusAlias: true, studentId: true, email: true } },
          listing: { select: { id: true, title: true, status: true, currentLeadingBidInCents: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      data: bids,
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

// ==========================================
// 6. CATEGORY MANAGEMENT
// ==========================================

adminRouter.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            listings: true
          }
        }
      }
    });
    return res.json({ success: true, data: categories });
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

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category name or slug already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description?.trim() || null,
        icon: icon || 'Tag'
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'CREATE_CATEGORY',
        targetType: 'CATEGORY',
        targetId: category.id,
        payload: JSON.stringify(category)
      }
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, icon } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim(),
        slug: slug?.trim().toLowerCase(),
        description: description?.trim(),
        icon
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'UPDATE_CATEGORY',
        targetType: 'CATEGORY',
        targetId: category.id,
        payload: JSON.stringify({ name, slug })
      }
    });

    return res.json({ success: true, data: category });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { listings: true } } }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category._count.listings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}" because ${category._count.listings} listing(s) are currently attached to it.`
      });
    }

    await prisma.category.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'DELETE_CATEGORY',
        targetType: 'CATEGORY',
        targetId: category.id,
        payload: JSON.stringify({ name: category.name })
      }
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

    const where: any = {};
    if (status !== 'ALL') where.status = status;
    if (priority !== 'ALL') where.priority = priority;
    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { description: { contains: q } },
        { category: { contains: q } },
        { reporter: { campusAlias: { contains: q } } },
        { reportedUser: { campusAlias: { contains: q } } }
      ];
    }

    const [total, disputes] = await Promise.all([
      prisma.dispute.count({ where }),
      prisma.dispute.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
          reportedUser: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
          listing: { select: { id: true, title: true, status: true, currentLeadingBidInCents: true } },
          assignedAdmin: { select: { id: true, campusAlias: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      data: disputes,
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

adminRouter.get('/disputes/:id', async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        reporter: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
        reportedUser: { select: { id: true, fullName: true, campusAlias: true, email: true, studentId: true } },
        listing: {
          include: {
            images: { take: 1 },
            seller: { select: { campusAlias: true } }
          }
        },
        assignedAdmin: { select: { id: true, campusAlias: true } }
      }
    });

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    return res.json({ success: true, data: dispute });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/disputes/:id', async (req: AuthRequest, res) => {
  try {
    const { status, priority, assignedAdminId, internalNotes, resolutionReason } = req.body;

    const existing = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedAdminId !== undefined) updateData.assignedAdminId = assignedAdminId;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (resolutionReason !== undefined) updateData.resolutionReason = resolutionReason;
    if (status === 'RESOLVED' || status === 'REJECTED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.dispute.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Notify reporter if resolved or status updated
    if (status && status !== existing.status) {
      await prisma.notification.create({
        data: {
          userId: existing.reporterId,
          type: 'SYSTEM',
          title: `Dispute Report ${status}`,
          message: `Your dispute report (ID: ${existing.id.substring(0, 8)}) is now marked as ${status}.${resolutionReason ? ` Resolution notes: ${resolutionReason}` : ''}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'UPDATE_DISPUTE',
        targetType: 'DISPUTE',
        targetId: updated.id,
        payload: JSON.stringify({ previousStatus: existing.status, newStatus: status, resolutionReason })
      }
    });

    return res.json({ success: true, data: updated, message: 'Dispute updated successfully' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. NOTIFICATION MANAGEMENT
// ==========================================

adminRouter.get('/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { fullName: true, campusAlias: true, email: true } }
      }
    });

    const totalCount = await prisma.notification.count();
    const unreadCount = await prisma.notification.count({ where: { isRead: false } });

    return res.json({
      success: true,
      data: {
        notifications,
        totalCount,
        unreadCount
      }
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

    let targetUsers: { id: string }[] = [];

    if (target === 'INDIVIDUAL' && targetUserId) {
      targetUsers = [{ id: targetUserId }];
    } else if (target === 'VERIFIED_STUDENTS') {
      targetUsers = await prisma.user.findMany({
        where: { role: 'STUDENT', isEmailVerified: true, isSuspended: false },
        select: { id: true }
      });
    } else if (target === 'SUSPENDED_STUDENTS') {
      targetUsers = await prisma.user.findMany({
        where: { role: 'STUDENT', isSuspended: true },
        select: { id: true }
      });
    } else {
      // ALL_STUDENTS
      targetUsers = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true }
      });
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'No target students matched this criteria' });
    }

    await prisma.notification.createMany({
      data: targetUsers.map(u => ({
        userId: u.id,
        type,
        title: title.trim(),
        message: message.trim(),
        metadata: JSON.stringify({ senderAdmin: req.user!.campusAlias, sentAt: new Date() })
      }))
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'BROADCAST_NOTIFICATION',
        targetType: 'NOTIFICATION',
        payload: JSON.stringify({ title, target, recipientCount: targetUsers.length })
      }
    });

    return res.status(201).json({
      success: true,
      message: `Notification successfully sent to ${targetUsers.length} student(s)`
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
      topSellers,
      topBidders
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { role: 'STUDENT', isEmailVerified: true, createdAt: { gte: startDate } } }),
      prisma.auctionListing.count({ where: { createdAt: { gte: startDate } } }),
      prisma.auctionListing.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate } } }),
      prisma.auctionListing.count({ where: { status: 'UNSOLD', createdAt: { gte: startDate } } }),
      prisma.bid.count({ where: { acceptedAt: { gte: startDate } } }),
      prisma.dispute.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        take: 5,
        orderBy: { listings: { _count: 'desc' } },
        select: {
          id: true,
          fullName: true,
          campusAlias: true,
          studentId: true,
          _count: { select: { listings: true } }
        }
      }),
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        take: 5,
        orderBy: { bids: { _count: 'desc' } },
        select: {
          id: true,
          fullName: true,
          campusAlias: true,
          studentId: true,
          _count: { select: { bids: true } }
        }
      })
    ]);

    const completedListings = await prisma.auctionListing.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: startDate } },
      select: { currentLeadingBidInCents: true }
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
        topBidders
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.get('/reports/export', async (req, res) => {
  try {
    const { type = 'auctions' } = req.query;

    if (type === 'auctions') {
      const items = await prisma.auctionListing.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          seller: { select: { campusAlias: true, studentId: true } },
          _count: { select: { bids: true } }
        }
      });

      const csvRows = [
        ['ID', 'Title', 'Category', 'Seller Alias', 'Starting Price (INR)', 'Final/Leading Bid (INR)', 'Bids Count', 'Status', 'Closing Time', 'Created At']
      ];
      for (const item of items) {
        csvRows.push([
          item.id,
          `"${item.title.replace(/"/g, '""')}"`,
          `"${item.category.name}"`,
          item.seller.campusAlias,
          (item.startingPriceInCents / 100).toFixed(2),
          (item.currentLeadingBidInCents / 100).toFixed(2),
          item._count.bids.toString(),
          item.status,
          item.closingTime.toISOString(),
          item.createdAt.toISOString()
        ]);
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="auctions_report.csv"');
      return res.send(csvRows.map(r => r.join(',')).join('\n'));
    }

    if (type === 'bids') {
      const items = await prisma.bid.findMany({
        orderBy: { acceptedAt: 'desc' },
        include: {
          bidder: { select: { campusAlias: true, studentId: true } },
          listing: { select: { title: true } }
        }
      });
      const csvRows = [
        ['Bid ID', 'Auction Title', 'Bidder Alias', 'Student ID', 'Amount (INR)', 'Accepted At']
      ];
      for (const b of items) {
        csvRows.push([
          b.id,
          `"${b.listing.title.replace(/"/g, '""')}"`,
          b.bidder.campusAlias,
          b.bidder.studentId,
          (b.amountInCents / 100).toFixed(2),
          b.acceptedAt.toISOString()
        ]);
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bids_report.csv"');
      return res.send(csvRows.map(r => r.join(',')).join('\n'));
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

    const where: any = {};
    if (action) where.action = action as string;
    if (targetType) where.targetType = targetType as string;
    if (search) {
      where.OR = [
        { action: { contains: search as string } },
        { targetType: { contains: search as string } },
        { payload: { contains: search as string } },
        { actor: { campusAlias: { contains: search as string } } }
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, campusAlias: true, email: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      data: logs,
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

adminRouter.get('/audit-logs/export', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { actor: { select: { campusAlias: true } } }
    });

    const csvRows = [
      ['ID', 'Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID', 'Details']
    ];
    for (const log of logs) {
      csvRows.push([
        log.id,
        log.createdAt.toISOString(),
        log.actor?.campusAlias || 'System',
        log.action,
        log.targetType,
        log.targetId || '',
        `"${(log.payload || '').replace(/"/g, '""')}"`
      ]);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campus_audit_logs.csv"');
    return res.send(csvRows.map(r => r.join(',')).join('\n'));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 11. SYSTEM SETTINGS
// ==========================================

adminRouter.get('/settings', async (req, res) => {
  try {
    const settingsList = await prisma.adminSetting.findMany();
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
      await prisma.adminSetting.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          updatedBy: req.user!.id
        },
        create: {
          key,
          value: JSON.stringify(value),
          updatedBy: req.user!.id
        }
      });
      updatedKeys.push(key);
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        targetType: 'SYSTEM_SETTINGS',
        payload: JSON.stringify({ updatedKeys })
      }
    });

    return res.json({ success: true, message: 'Settings saved successfully', updatedKeys });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
