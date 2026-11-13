"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.answerSchema = exports.questionSchema = exports.handoverRecordSchema = exports.sellerDecisionSchema = exports.autoBidSchema = exports.placeBidSchema = exports.updateListingSchema = exports.createListingSchema = exports.loginSchema = exports.registerSchema = exports.NotificationType = exports.BidType = exports.AuctionStatus = exports.ItemCondition = exports.UserRole = void 0;
const zod_1 = require("zod");
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "STUDENT";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var ItemCondition;
(function (ItemCondition) {
    ItemCondition["NEW"] = "NEW";
    ItemCondition["LIKE_NEW"] = "LIKE_NEW";
    ItemCondition["GOOD"] = "GOOD";
    ItemCondition["FAIR"] = "FAIR";
    ItemCondition["POOR"] = "POOR";
})(ItemCondition || (exports.ItemCondition = ItemCondition = {}));
var AuctionStatus;
(function (AuctionStatus) {
    AuctionStatus["DRAFT"] = "DRAFT";
    AuctionStatus["PENDING_MODERATION"] = "PENDING_MODERATION";
    AuctionStatus["SCHEDULED"] = "SCHEDULED";
    AuctionStatus["ACTIVE"] = "ACTIVE";
    AuctionStatus["PENDING_SELLER_DECISION"] = "PENDING_SELLER_DECISION";
    AuctionStatus["RESERVED"] = "RESERVED";
    AuctionStatus["COMPLETED"] = "COMPLETED";
    AuctionStatus["UNSOLD"] = "UNSOLD";
    AuctionStatus["REJECTED"] = "REJECTED";
    AuctionStatus["CANCELLED"] = "CANCELLED";
    AuctionStatus["PICKUP_FAILED"] = "PICKUP_FAILED";
})(AuctionStatus || (exports.AuctionStatus = AuctionStatus = {}));
var BidType;
(function (BidType) {
    BidType["MANUAL"] = "MANUAL";
    BidType["AUTO_PROXY"] = "AUTO_PROXY";
    BidType["AI_CONFIRMED"] = "AI_CONFIRMED";
})(BidType || (exports.BidType = BidType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["OUTBID"] = "OUTBID";
    NotificationType["BID_ACCEPTED"] = "BID_ACCEPTED";
    NotificationType["CLOSING_SOON"] = "CLOSING_SOON";
    NotificationType["PROVISIONAL_WIN"] = "PROVISIONAL_WIN";
    NotificationType["SELLER_DECISION"] = "SELLER_DECISION";
    NotificationType["HANDOVER_UPDATE"] = "HANDOVER_UPDATE";
    NotificationType["SAVED_SEARCH_MATCH"] = "SAVED_SEARCH_MATCH";
    NotificationType["QUESTION_RECEIVED"] = "QUESTION_RECEIVED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Validation schemas
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email().refine(val => val.endsWith('.edu') || val.includes('campus') || val.includes('student') || val.includes('@'), {
        message: 'Valid student email required'
    }),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2, 'Full name required'),
    campusAlias: zod_1.z.string().min(2, 'Campus alias required'),
    studentId: zod_1.z.string().min(3, 'Student ID required')
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1)
});
const imageItemSchema = zod_1.z.string().refine((val) => val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'), { message: 'Must be a valid web URL or uploaded image file' });
exports.createListingSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(100),
    categoryId: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(10).max(2000),
    condition: zod_1.z.nativeEnum(ItemCondition),
    startingPriceInCents: zod_1.z.number().int().positive('Starting price must be greater than zero'),
    minIncrementInCents: zod_1.z.number().int().positive('Minimum increment must be positive'),
    startTime: zod_1.z.string().datetime().optional(),
    closingTime: zod_1.z.string().datetime(),
    pickupLocation: zod_1.z.string().min(3, 'Specify safe campus pickup point'),
    sellerNotes: zod_1.z.string().max(500).optional(),
    imageUrls: zod_1.z.array(imageItemSchema).min(1, 'At least one image is required')
});
exports.updateListingSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(100).optional(),
    categoryId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(10).max(2000).optional(),
    condition: zod_1.z.nativeEnum(ItemCondition).optional(),
    startingPriceInCents: zod_1.z.number().int().positive().optional(),
    minIncrementInCents: zod_1.z.number().int().positive().optional(),
    closingTime: zod_1.z.string().datetime().optional(),
    pickupLocation: zod_1.z.string().min(3).optional(),
    sellerNotes: zod_1.z.string().max(500).optional().nullable(),
    imageUrls: zod_1.z.array(imageItemSchema).min(1).optional()
});
exports.placeBidSchema = zod_1.z.object({
    amountInCents: zod_1.z.number().int().positive(),
    idempotencyKey: zod_1.z.string().uuid()
});
exports.autoBidSchema = zod_1.z.object({
    maxLimitInCents: zod_1.z.number().int().positive()
});
exports.sellerDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['APPROVE', 'REJECT']),
    rejectionReason: zod_1.z.string().optional()
});
exports.handoverRecordSchema = zod_1.z.object({
    status: zod_1.z.enum(['COMPLETED', 'FAILED']),
    pickupNotes: zod_1.z.string().optional()
});
exports.questionSchema = zod_1.z.object({
    content: zod_1.z.string().min(3).max(500)
});
exports.answerSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(1000)
});
