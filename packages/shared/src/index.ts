import { z } from 'zod';

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export enum ItemCondition {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR'
}

export enum AuctionStatus {
  DRAFT = 'DRAFT',
  PENDING_MODERATION = 'PENDING_MODERATION',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PENDING_SELLER_DECISION = 'PENDING_SELLER_DECISION',
  RESERVED = 'RESERVED',
  COMPLETED = 'COMPLETED',
  UNSOLD = 'UNSOLD',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PICKUP_FAILED = 'PICKUP_FAILED'
}

export enum BidType {
  MANUAL = 'MANUAL',
  AUTO_PROXY = 'AUTO_PROXY',
  AI_CONFIRMED = 'AI_CONFIRMED'
}

export enum NotificationType {
  OUTBID = 'OUTBID',
  BID_ACCEPTED = 'BID_ACCEPTED',
  CLOSING_SOON = 'CLOSING_SOON',
  PROVISIONAL_WIN = 'PROVISIONAL_WIN',
  SELLER_DECISION = 'SELLER_DECISION',
  HANDOVER_UPDATE = 'HANDOVER_UPDATE',
  SAVED_SEARCH_MATCH = 'SAVED_SEARCH_MATCH',
  QUESTION_RECEIVED = 'QUESTION_RECEIVED'
}

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email().refine(val => val.endsWith('.edu') || val.includes('campus') || val.includes('student') || val.includes('@'), {
    message: 'Valid student email required'
  }),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name required'),
  campusAlias: z.string().min(2, 'Campus alias required'),
  studentId: z.string().min(3, 'Student ID required')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createListingSchema = z.object({
  title: z.string().min(3).max(100),
  categoryId: z.string().uuid(),
  description: z.string().min(10).max(2000),
  condition: z.nativeEnum(ItemCondition),
  startingPriceInCents: z.number().int().positive('Starting price must be greater than zero'),
  minIncrementInCents: z.number().int().positive('Minimum increment must be positive'),
  startTime: z.string().datetime().optional(),
  closingTime: z.string().datetime(),
  pickupLocation: z.string().min(3, 'Specify safe campus pickup point'),
  sellerNotes: z.string().max(500).optional(),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image is required')
});

export const updateListingSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(10).max(2000).optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  startingPriceInCents: z.number().int().positive().optional(),
  minIncrementInCents: z.number().int().positive().optional(),
  closingTime: z.string().datetime().optional(),
  pickupLocation: z.string().min(3).optional(),
  sellerNotes: z.string().max(500).optional().nullable(),
  imageUrls: z.array(z.string().url()).min(1).optional()
});

export const placeBidSchema = z.object({
  amountInCents: z.number().int().positive(),
  idempotencyKey: z.string().uuid()
});

export const autoBidSchema = z.object({
  maxLimitInCents: z.number().int().positive()
});

export const sellerDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional()
});

export const handoverRecordSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  pickupNotes: z.string().optional()
});

export const questionSchema = z.object({
  content: z.string().min(3).max(500)
});

export const answerSchema = z.object({
  content: z.string().min(1).max(1000)
});
