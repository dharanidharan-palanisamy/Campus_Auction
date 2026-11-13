import { z } from 'zod';
export declare enum UserRole {
    STUDENT = "STUDENT",
    ADMIN = "ADMIN"
}
export declare enum ItemCondition {
    NEW = "NEW",
    LIKE_NEW = "LIKE_NEW",
    GOOD = "GOOD",
    FAIR = "FAIR",
    POOR = "POOR"
}
export declare enum AuctionStatus {
    DRAFT = "DRAFT",
    PENDING_MODERATION = "PENDING_MODERATION",
    SCHEDULED = "SCHEDULED",
    ACTIVE = "ACTIVE",
    PENDING_SELLER_DECISION = "PENDING_SELLER_DECISION",
    RESERVED = "RESERVED",
    COMPLETED = "COMPLETED",
    UNSOLD = "UNSOLD",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    PICKUP_FAILED = "PICKUP_FAILED"
}
export declare enum BidType {
    MANUAL = "MANUAL",
    AUTO_PROXY = "AUTO_PROXY",
    AI_CONFIRMED = "AI_CONFIRMED"
}
export declare enum NotificationType {
    OUTBID = "OUTBID",
    BID_ACCEPTED = "BID_ACCEPTED",
    CLOSING_SOON = "CLOSING_SOON",
    PROVISIONAL_WIN = "PROVISIONAL_WIN",
    SELLER_DECISION = "SELLER_DECISION",
    HANDOVER_UPDATE = "HANDOVER_UPDATE",
    SAVED_SEARCH_MATCH = "SAVED_SEARCH_MATCH",
    QUESTION_RECEIVED = "QUESTION_RECEIVED"
}
export declare const registerSchema: z.ZodObject<{
    email: z.ZodEffects<z.ZodString, string, string>;
    password: z.ZodString;
    fullName: z.ZodString;
    campusAlias: z.ZodString;
    studentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    campusAlias: string;
    studentId: string;
}, {
    email: string;
    password: string;
    fullName: string;
    campusAlias: string;
    studentId: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createListingSchema: z.ZodObject<{
    title: z.ZodString;
    categoryId: z.ZodString;
    description: z.ZodString;
    condition: z.ZodNativeEnum<typeof ItemCondition>;
    startingPriceInCents: z.ZodNumber;
    minIncrementInCents: z.ZodNumber;
    startTime: z.ZodOptional<z.ZodString>;
    closingTime: z.ZodString;
    pickupLocation: z.ZodString;
    sellerNotes: z.ZodOptional<z.ZodString>;
    imageUrls: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    categoryId: string;
    description: string;
    condition: ItemCondition;
    startingPriceInCents: number;
    minIncrementInCents: number;
    closingTime: string;
    pickupLocation: string;
    imageUrls: string[];
    startTime?: string | undefined;
    sellerNotes?: string | undefined;
}, {
    title: string;
    categoryId: string;
    description: string;
    condition: ItemCondition;
    startingPriceInCents: number;
    minIncrementInCents: number;
    closingTime: string;
    pickupLocation: string;
    imageUrls: string[];
    startTime?: string | undefined;
    sellerNotes?: string | undefined;
}>;
export declare const updateListingSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodNativeEnum<typeof ItemCondition>>;
    startingPriceInCents: z.ZodOptional<z.ZodNumber>;
    minIncrementInCents: z.ZodOptional<z.ZodNumber>;
    closingTime: z.ZodOptional<z.ZodString>;
    pickupLocation: z.ZodOptional<z.ZodString>;
    sellerNotes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imageUrls: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    categoryId?: string | undefined;
    description?: string | undefined;
    condition?: ItemCondition | undefined;
    startingPriceInCents?: number | undefined;
    minIncrementInCents?: number | undefined;
    closingTime?: string | undefined;
    pickupLocation?: string | undefined;
    sellerNotes?: string | null | undefined;
    imageUrls?: string[] | undefined;
}, {
    title?: string | undefined;
    categoryId?: string | undefined;
    description?: string | undefined;
    condition?: ItemCondition | undefined;
    startingPriceInCents?: number | undefined;
    minIncrementInCents?: number | undefined;
    closingTime?: string | undefined;
    pickupLocation?: string | undefined;
    sellerNotes?: string | null | undefined;
    imageUrls?: string[] | undefined;
}>;
export declare const placeBidSchema: z.ZodObject<{
    amountInCents: z.ZodNumber;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amountInCents: number;
    idempotencyKey: string;
}, {
    amountInCents: number;
    idempotencyKey: string;
}>;
export declare const autoBidSchema: z.ZodObject<{
    maxLimitInCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    maxLimitInCents: number;
}, {
    maxLimitInCents: number;
}>;
export declare const sellerDecisionSchema: z.ZodObject<{
    decision: z.ZodEnum<["APPROVE", "REJECT"]>;
    rejectionReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision: "APPROVE" | "REJECT";
    rejectionReason?: string | undefined;
}, {
    decision: "APPROVE" | "REJECT";
    rejectionReason?: string | undefined;
}>;
export declare const handoverRecordSchema: z.ZodObject<{
    status: z.ZodEnum<["COMPLETED", "FAILED"]>;
    pickupNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "FAILED";
    pickupNotes?: string | undefined;
}, {
    status: "COMPLETED" | "FAILED";
    pickupNotes?: string | undefined;
}>;
export declare const questionSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const answerSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
