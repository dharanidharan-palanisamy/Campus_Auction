import mongoose from 'mongoose';
import { User, SellerReview, HandoverRecord, AuctionListing, Dispute, Bid, AuctionOutcome } from '../models';

export class TrustService {
  /**
   * Recalculates and persists a student seller's trust score and reputation tier in MongoDB.
   * Trust Score Formula (0 to 100):
   * - Base verification credit: +30 (if account verified) or +10
   * - Rating factor (0-40): average star rating out of 5 scaled to 40 pts
   * - Successful handovers (0-20): +4 pts per verified handover (capped at 20)
   * - Response rate (0-10): up to +10 pts for high responsiveness
   * - Dispute penalties: -15 pts per upheld dispute against seller
   */
  static async calculateAndSaveTrustScore(userId: string | mongoose.Types.ObjectId): Promise<{
    trustScore: number;
    trustTier: 'NEWBIE' | 'RISING' | 'TRUSTED' | 'ELITE';
    ratingCount: number;
    averageRating: number;
    successfulHandoversCount: number;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId);
    if (!user) throw new Error('User not found');

    // 1. Fetch all seller reviews
    const reviews = await SellerReview.find({ sellerId: userObjectId });
    const ratingCount = reviews.length;
    let averageRating = 5.0;
    if (ratingCount > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.overallRating, 0);
      averageRating = Math.round((sum / ratingCount) * 10) / 10;
    }

    // 2. Count verified successful handovers
    const successfulHandoversCount = await HandoverRecord.countDocuments({
      sellerId: userObjectId,
      handoverStatus: 'COMPLETED',
    });

    // 3. Count disputes against seller
    const disputesCount = await Dispute.countDocuments({
      reportedUserId: userObjectId,
      status: 'RESOLVED',
    });

    // 4. Calculate score components
    const isVerified = user.verificationStatus === 'VERIFIED';
    const verificationPoints = isVerified ? 30 : 10;
    const ratingPoints = ratingCount > 0 ? (averageRating / 5) * 40 : 30; // default benchmark
    const handoverPoints = Math.min(20, successfulHandoversCount * 4);
    const responsePoints = Math.min(10, Math.round((user.responseRatePercent || 90) / 10));
    const disputePenalties = disputesCount * 15;

    let totalScore = Math.round(verificationPoints + ratingPoints + handoverPoints + responsePoints - disputePenalties);
    totalScore = Math.max(10, Math.min(100, totalScore));

    // Determine tier
    let trustTier: 'NEWBIE' | 'RISING' | 'TRUSTED' | 'ELITE' = 'NEWBIE';
    if (totalScore >= 90 && successfulHandoversCount >= 3) {
      trustTier = 'ELITE';
    } else if (totalScore >= 75) {
      trustTier = 'TRUSTED';
    } else if (totalScore >= 60) {
      trustTier = 'RISING';
    } else {
      trustTier = 'NEWBIE';
    }

    user.trustScore = totalScore;
    user.trustTier = trustTier;
    user.ratingCount = ratingCount;
    user.averageRating = averageRating;
    user.successfulHandoversCount = successfulHandoversCount;
    await user.save();

    return {
      trustScore: totalScore,
      trustTier,
      ratingCount,
      averageRating,
      successfulHandoversCount,
    };
  }

  /**
   * Retrieves full trust breakdown and recent buyer reviews for public profile / auction badge.
   */
  static async getUserTrustProfile(userId: string | mongoose.Types.ObjectId) {
    const user = await User.findById(userId).select(
      'fullName campusAlias college department avatarUrl verificationStatus trustScore trustTier ratingCount averageRating successfulHandoversCount responseRatePercent createdAt'
    );
    if (!user) throw new Error('User not found');

    const reviews = await SellerReview.find({ sellerId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('buyerId', 'campusAlias avatarUrl');

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        campusAlias: user.campusAlias,
        college: user.college,
        department: user.department,
        avatarUrl: user.avatarUrl,
        verificationStatus: user.verificationStatus,
        memberSince: user.createdAt,
      },
      reputation: {
        score: user.trustScore ?? 80,
        tier: user.trustTier ?? 'TRUSTED',
        averageRating: user.averageRating ?? 5.0,
        ratingCount: user.ratingCount ?? 0,
        successfulHandoversCount: user.successfulHandoversCount ?? 0,
        responseRatePercent: user.responseRatePercent ?? 95,
      },
      recentReviews: reviews.map((r: any) => ({
        id: r._id.toString(),
        overallRating: r.overallRating,
        itemAccuracyRating: r.itemAccuracyRating,
        communicationRating: r.communicationRating,
        comment: r.comment,
        createdAt: r.createdAt,
        buyer: {
          campusAlias: r.buyerId?.campusAlias || 'Student Buyer',
          avatarUrl: r.buyerId?.avatarUrl,
        },
      })),
    };
  }

  /**
   * Submits a verified buyer review after an auction handover.
   */
  static async submitReview(params: {
    listingId: string;
    buyerId: string;
    overallRating: number;
    itemAccuracyRating?: number;
    communicationRating?: number;
    comment?: string;
  }) {
    const listing = await AuctionListing.findById(params.listingId);
    if (!listing) throw new Error('Listing not found');

    // Confirm that listing was won by this buyer
    let winningBidderId: string | null = null;
    if (listing.leadingBidId) {
      const leadingBid = await Bid.findById(listing.leadingBidId);
      winningBidderId = leadingBid?.bidderId?.toString() || null;
    }
    if (!winningBidderId) {
      const outcome = await AuctionOutcome.findOne({ listingId: listing._id });
      winningBidderId = outcome?.winnerId?.toString() || null;
    }

    if (!winningBidderId || winningBidderId !== params.buyerId) {
      throw new Error('Only the winning student buyer can submit a review for this auction.');
    }

    // Check if review already exists
    const existing = await SellerReview.findOne({
      listingId: listing._id,
      buyerId: new mongoose.Types.ObjectId(params.buyerId),
    });
    if (existing) {
      throw new Error('You have already submitted a review for this auction transaction.');
    }

    const review = await SellerReview.create({
      listingId: listing._id,
      sellerId: listing.sellerId,
      buyerId: new mongoose.Types.ObjectId(params.buyerId),
      overallRating: Math.min(5, Math.max(1, params.overallRating)),
      itemAccuracyRating: Math.min(5, Math.max(1, params.itemAccuracyRating || params.overallRating)),
      communicationRating: Math.min(5, Math.max(1, params.communicationRating || params.overallRating)),
      comment: params.comment?.trim(),
    });

    // Update seller trust score immediately
    await TrustService.calculateAndSaveTrustScore(listing.sellerId);

    return review;
  }
}
