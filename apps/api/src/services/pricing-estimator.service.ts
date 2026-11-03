import mongoose from 'mongoose';
import { AuctionListing, Category } from '../models';

export interface PriceEstimationResult {
  estimatedResalePrice: {
    min: number;
    max: number;
    median: number;
  };
  recommendedStartingPrice: number;
  recommendedMinIncrement: number;
  demandLevel: 'HIGH' | 'MEDIUM' | 'MODERATE';
  confidenceScore: number; // 0-100%
  rationale: string;
  comparableAuctionsFound: number;
  categoryBenchmarkAvg?: number;
}

export class PricingEstimatorService {
  /**
   * Intelligently estimates fair campus resale price, recommended starting bid,
   * and optimal increment based on item details, condition, and historical DB market comps.
   */
  static async estimatePrice(params: {
    title: string;
    categoryId?: string;
    condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
    description?: string;
    imageUrl?: string;
  }): Promise<PriceEstimationResult> {
    const { title, categoryId, condition, description } = params;

    // 1. Query completed historical auctions in the same category or matching keywords
    const filter: any = {
      status: { $in: ['COMPLETED', 'RESERVED', 'PENDING_SELLER_DECISION'] },
      currentLeadingBidInCents: { $gt: 0 },
    };

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const historicalComps = await AuctionListing.find(filter)
      .select('title startingPriceInCents currentLeadingBidInCents condition status createdAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // 2. Condition retention factors
    const conditionMultipliers: Record<string, number> = {
      NEW: 0.95,
      LIKE_NEW: 0.80,
      GOOD: 0.65,
      FAIR: 0.45,
      POOR: 0.30,
    };
    const multiplier = conditionMultipliers[condition] || 0.65;

    // 3. Extract baseline prices from comps (in Rupees)
    let baseCompPrices: number[] = [];
    if (historicalComps.length > 0) {
      baseCompPrices = historicalComps.map((c) =>
        Math.round((c.currentLeadingBidInCents || c.startingPriceInCents || 0) / 100)
      );
    }

    // Keyword heuristics if comps are sparse
    let inferredBase = 1200; // default baseline ₹1200
    const lowerTitle = (title + ' ' + (description || '')).toLowerCase();

    if (lowerTitle.includes('cycle') || lowerTitle.includes('bicycle')) inferredBase = 3500;
    else if (lowerTitle.includes('calculator') || lowerTitle.includes('fx-')) inferredBase = 950;
    else if (lowerTitle.includes('monitor') || lowerTitle.includes('display')) inferredBase = 4500;
    else if (lowerTitle.includes('keyboard') || lowerTitle.includes('mouse')) inferredBase = 700;
    else if (lowerTitle.includes('book') || lowerTitle.includes('edition') || lowerTitle.includes('author')) inferredBase = 400;
    else if (lowerTitle.includes('guitar') || lowerTitle.includes('instrument')) inferredBase = 2800;
    else if (lowerTitle.includes('laptop') || lowerTitle.includes('macbook') || lowerTitle.includes('thinkpad')) inferredBase = 25000;
    else if (lowerTitle.includes('chair') || lowerTitle.includes('table') || lowerTitle.includes('desk')) inferredBase = 1500;
    else if (lowerTitle.includes('phone') || lowerTitle.includes('iphone') || lowerTitle.includes('samsung') || lowerTitle.includes('oneplus')) inferredBase = 12000;
    else if (lowerTitle.includes('headphones') || lowerTitle.includes('earbuds') || lowerTitle.includes('airpods')) inferredBase = 2200;
    else if (lowerTitle.includes('cooler') || lowerTitle.includes('fan') || lowerTitle.includes('kettle')) inferredBase = 1100;

    let medianComp = inferredBase;
    if (baseCompPrices.length > 0) {
      baseCompPrices.sort((a, b) => a - b);
      const mid = Math.floor(baseCompPrices.length / 2);
      medianComp = baseCompPrices.length % 2 === 0
        ? (baseCompPrices[mid - 1] + baseCompPrices[mid]) / 2
        : baseCompPrices[mid];
      // Blend 60% historical comp median + 40% keyword baseline
      medianComp = Math.round(medianComp * 0.6 + inferredBase * 0.4);
    }

    // 4. Calculate Resale Estimates (min, max, median)
    const estimatedMedian = Math.round(medianComp * multiplier);
    const estimatedMin = Math.round(estimatedMedian * 0.85);
    const estimatedMax = Math.round(estimatedMedian * 1.25);

    // 5. Calculate recommended starting price (50% to 65% of median resale to spark competitive bidding)
    const recommendedStartingPrice = Math.max(10, Math.round(estimatedMedian * 0.55 / 10) * 10);

    // 6. Calculate recommended min increment based on magnitude
    let recommendedMinIncrement = 50;
    if (recommendedStartingPrice < 300) recommendedMinIncrement = 20;
    else if (recommendedStartingPrice < 1000) recommendedMinIncrement = 50;
    else if (recommendedStartingPrice < 5000) recommendedMinIncrement = 100;
    else if (recommendedStartingPrice < 20000) recommendedMinIncrement = 250;
    else recommendedMinIncrement = 500;

    // 7. Demand determination
    let demandLevel: 'HIGH' | 'MEDIUM' | 'MODERATE' = 'MEDIUM';
    if (multiplier >= 0.75 || ['cycle', 'bicycle', 'calculator', 'laptop', 'monitor'].some((k) => lowerTitle.includes(k))) {
      demandLevel = 'HIGH';
    } else if (condition === 'POOR' || condition === 'FAIR') {
      demandLevel = 'MODERATE';
    }

    const confidenceScore = Math.min(95, 65 + Math.min(25, historicalComps.length * 3));

    const rationale = `Based on campus historical sales for "${title.slice(0, 30)}" in ${condition.replace('_', ' ')} condition. Setting starting bid at ~55% (₹${recommendedStartingPrice}) incentivizes student participation and triggers anti-sniping bid momentum.`;

    return {
      estimatedResalePrice: {
        min: estimatedMin,
        max: estimatedMax,
        median: estimatedMedian,
      },
      recommendedStartingPrice,
      recommendedMinIncrement,
      demandLevel,
      confidenceScore,
      rationale,
      comparableAuctionsFound: historicalComps.length,
      categoryBenchmarkAvg: baseCompPrices.length > 0 ? Math.round(baseCompPrices.reduce((a, b) => a + b, 0) / baseCompPrices.length) : undefined,
    };
  }
}
