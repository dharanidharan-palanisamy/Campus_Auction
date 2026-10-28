import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

export const studentRouter = Router();

studentRouter.use(authenticateToken);

// 1. Student Dashboard Activity (Buyer & Seller metrics)
studentRouter.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [
      activeListings,
      activeBids,
      leadingBids,
      wonAuctions,
      savedItemsCount,
      unreadNotificationsCount
    ] = await Promise.all([
      // Seller: active listings
      prisma.auctionListing.findMany({
        where: { sellerId: userId, status: 'ACTIVE' },
        include: { _count: { select: { bids: true } } }
      }),
      // Buyer: listings where user has placed a bid
      prisma.bid.findMany({
        where: { bidderId: userId },
        distinct: ['listingId'],
        include: {
          listing: {
            include: {
              category: true,
              bids: { orderBy: { amountInCents: 'desc' }, take: 1 }
            }
          }
        }
      }),
      // Leading: auctions where user is currently leading
      prisma.auctionListing.count({
        where: {
          status: 'ACTIVE',
          bids: { some: { bidderId: userId } },
          // checked via latest leading bid id or bidder
        }
      }),
      // Provisional wins / won outcomes
      prisma.auctionOutcome.findMany({
        where: { winnerId: userId },
        include: { listing: { include: { seller: { select: { campusAlias: true } } } } }
      }),
      // Saved listings
      prisma.savedListing.count({ where: { userId } }),
      // Unread notifications
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return res.json({
      success: true,
      data: {
        activeListings,
        activeBidsCount: activeBids.length,
        wonAuctions,
        savedItemsCount,
        unreadNotificationsCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Notifications
studentRouter.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json({ success: true, data: notifications });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

studentRouter.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true }
    });
    return res.json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3. Saved Listings
studentRouter.get('/saved-listings', async (req: AuthRequest, res) => {
  try {
    const saved = await prisma.savedListing.findMany({
      where: { userId: req.user!.id },
      include: {
        user: false,
        // Using direct query for listings
      }
    });

    const listingIds = saved.map(s => s.listingId);
    const listings = await prisma.auctionListing.findMany({
      where: { id: { in: listingIds } },
      include: { images: true, category: true }
    });

    return res.json({ success: true, data: listings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

studentRouter.post('/saved-listings/:listingId', async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.params;
    const existing = await prisma.savedListing.findUnique({
      where: { userId_listingId: { userId: req.user!.id, listingId } }
    });

    if (existing) {
      await prisma.savedListing.delete({ where: { id: existing.id } });
      return res.json({ success: true, saved: false, message: 'Removed from saved listings' });
    } else {
      await prisma.savedListing.create({
        data: { userId: req.user!.id, listingId }
      });
      return res.json({ success: true, saved: true, message: 'Saved to wishlist' });
    }
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
