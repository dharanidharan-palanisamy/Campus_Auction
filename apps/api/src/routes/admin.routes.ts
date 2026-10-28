import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest, requireAdmin } from '../middlewares/auth';

export const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

// 1. Student & Marketplace Stats Overview
adminRouter.get('/stats', async (req, res) => {
  try {
    const [
      totalStudents,
      verifiedStudents,
      pendingVerification,
      suspendedStudents,
      totalListings,
      activeAuctions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', isEmailVerified: true } }),
      prisma.user.count({ where: { role: 'STUDENT', isEmailVerified: false } }),
      prisma.user.count({ where: { role: 'STUDENT', isSuspended: true } }),
      prisma.auctionListing.count(),
      prisma.auctionListing.count({ where: { status: 'ACTIVE' } }),
    ]);

    return res.json({
      success: true,
      data: {
        totalStudents,
        verifiedStudents,
        pendingVerification,
        suspendedStudents,
        totalListings,
        activeAuctions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Manage Users (List, Verify, Suspend, Delete)
adminRouter.get('/users', async (req, res) => {
  try {
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2.1 Verify / Unverify Student
adminRouter.patch('/users/:id/verify', async (req: AuthRequest, res) => {
  try {
    const { isVerified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isEmailVerified: Boolean(isVerified) },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: isVerified ? 'VERIFY_STUDENT' : 'UNVERIFY_STUDENT',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ isEmailVerified: isVerified }),
      },
    });

    return res.json({ success: true, data: user, message: isVerified ? 'Student verified' : 'Student unverified' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 2.2 Suspend / Reactivate Student
adminRouter.patch('/users/:id/status', async (req: AuthRequest, res) => {
  try {
    const { isSuspended } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: Boolean(isSuspended) },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: isSuspended ? 'SUSPEND_STUDENT' : 'REACTIVATE_STUDENT',
        targetType: 'USER',
        targetId: user.id,
        payload: JSON.stringify({ isSuspended }),
      },
    });

    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 2.3 Delete Student
adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.savedListing.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.autoBidLimit.deleteMany({ where: { bidderId: userId } });
      await tx.questionAnswer.deleteMany({ where: { sellerId: userId } });
      await tx.question.deleteMany({ where: { askerId: userId } });
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
        payload: JSON.stringify({ email: targetUser.email, studentId: targetUser.studentId }),
      },
    });

    return res.json({ success: true, message: `Student account for ${targetUser.fullName} has been deleted` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Moderate Listings (Cancel / Force Close)
adminRouter.patch('/listings/:id/moderate', async (req: AuthRequest, res) => {
  try {
    const { status, reason } = req.body; // e.g. CANCELLED, REJECTED
    const listing = await prisma.auctionListing.update({
      where: { id: req.params.id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'MODERATE_LISTING',
        targetType: 'AUCTION_LISTING',
        targetId: listing.id,
        payload: JSON.stringify({ status, reason }),
      },
    });

    return res.json({ success: true, data: listing });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 4. Audit Logs
adminRouter.get('/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { campusAlias: true, email: true } } },
    });
    return res.json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
