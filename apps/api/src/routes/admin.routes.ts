import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest, requireAdmin } from '../middlewares/auth';

export const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

// 1. Marketplace Stats Overview
adminRouter.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalListings,
      activeAuctions,
      completedHandovers,
      totalBids,
      unsoldAuctions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.auctionListing.count(),
      prisma.auctionListing.count({ where: { status: 'ACTIVE' } }),
      prisma.auctionListing.count({ where: { status: 'COMPLETED' } }),
      prisma.bid.count(),
      prisma.auctionListing.count({ where: { status: 'UNSOLD' } }),
    ]);

    // Calculate total marketplace auction volume
    const completedListings = await prisma.auctionListing.findMany({
      where: { status: 'COMPLETED' },
      select: { currentLeadingBidInCents: true },
    });
    const totalVolumeInCents = completedListings.reduce((acc, curr) => acc + curr.currentLeadingBidInCents, 0);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalListings,
        activeAuctions,
        completedHandovers,
        totalBids,
        unsoldAuctions,
        totalVolumeInCents,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Manage Users (List, Suspend, Reactivate)
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
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
        action: isSuspended ? 'SUSPEND_USER' : 'REACTIVATE_USER',
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
