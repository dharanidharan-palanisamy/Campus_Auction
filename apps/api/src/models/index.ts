import mongoose, { Schema, Document, Model } from 'mongoose';

export const defaultSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret.__v;
      return ret;
    },
  },
};

// ==========================================
// 1. USER
// ==========================================
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  campusAlias: string;
  studentId?: string;
  role: 'STUDENT' | 'ADMIN';
  department?: string;
  college?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  profileImage?: string;
  isEmailVerified: boolean;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'REJECTED';
  verificationNotes?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedUntil?: Date;
  lastLogin?: Date;
  lastLoginAt?: Date;
  trustScore: number;
  trustTier: 'NEWBIE' | 'RISING' | 'TRUSTED' | 'ELITE';
  ratingCount: number;
  averageRating: number;
  successfulHandoversCount: number;
  responseRatePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    campusAlias: { type: String, required: true, trim: true },
    studentId: { type: String, unique: true, sparse: true, trim: true },
    role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT', index: true },
    department: { type: String, trim: true },
    college: { type: String, trim: true },
    phone: { type: String, trim: true },
    bio: { type: String, trim: true },
    avatarUrl: { type: String },
    isEmailVerified: { type: Boolean, default: true },
    verificationStatus: { type: String, enum: ['VERIFIED', 'PENDING', 'REJECTED'], default: 'VERIFIED' },
    accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'REJECTED'], default: 'ACTIVE' },
    verificationNotes: { type: String },
    isSuspended: { type: Boolean, default: false, index: true },
    suspensionReason: { type: String },
    suspendedUntil: { type: Date },
    lastLogin: { type: Date },
    trustScore: { type: Number, default: 80, min: 0, max: 100 },
    trustTier: { type: String, enum: ['NEWBIE', 'RISING', 'TRUSTED', 'ELITE'], default: 'TRUSTED' },
    ratingCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5.0 },
    successfulHandoversCount: { type: Number, default: 0 },
    responseRatePercent: { type: Number, default: 95 },
  },
  defaultSchemaOptions
);

UserSchema.virtual('lastLoginAt').get(function () {
  return this.lastLogin;
});
UserSchema.virtual('profileImage').get(function () {
  return this.avatarUrl;
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ==========================================
// 2. CATEGORY
// ==========================================
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String },
    icon: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  defaultSchemaOptions
);

export const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

// ==========================================
// 3. AUCTION LISTING
// ==========================================
export interface IListingImage {
  url: string;
  displayOrder: number;
}

export interface IAuctionListing extends Document {
  sellerId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  images: IListingImage[];
  startingPriceInCents: number;
  minIncrementInCents: number;
  currentLeadingBidInCents: number;
  leadingBidId?: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PENDING_SELLER_DECISION' | 'RESERVED' | 'COMPLETED' | 'UNSOLD' | 'REJECTED' | 'CANCELLED' | 'PICKUP_FAILED';
  startTime: Date;
  closingTime: Date;
  pickupLocation: string;
  sellerNotes?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuctionListingSchema = new Schema<IAuctionListing>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    title: { type: String, required: true, trim: true, index: 'text' },
    description: { type: String, required: true },
    condition: { type: String, enum: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'], default: 'GOOD' },
    images: [
      {
        url: { type: String, required: true },
        displayOrder: { type: Number, default: 0 },
      },
    ],
    startingPriceInCents: { type: Number, required: true },
    minIncrementInCents: { type: Number, required: true },
    currentLeadingBidInCents: { type: Number, default: 0, index: true },
    leadingBidId: { type: Schema.Types.ObjectId, ref: 'Bid' },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PENDING_SELLER_DECISION', 'RESERVED', 'COMPLETED', 'UNSOLD', 'REJECTED', 'CANCELLED', 'PICKUP_FAILED'],
      default: 'ACTIVE',
      index: true,
    },
    startTime: { type: Date, default: Date.now },
    closingTime: { type: Date, required: true, index: true },
    pickupLocation: { type: String, default: 'Campus Pickup' },
    sellerNotes: { type: String },
    version: { type: Number, default: 1 },
  },
  defaultSchemaOptions
);

AuctionListingSchema.index({ status: 1, closingTime: 1 });
AuctionListingSchema.index({ categoryId: 1, status: 1 });
AuctionListingSchema.index({ sellerId: 1, status: 1 });

AuctionListingSchema.virtual('startAt').get(function () {
  return this.startTime;
});
AuctionListingSchema.virtual('closesAt').get(function () {
  return this.closingTime;
});
AuctionListingSchema.virtual('startingPrice').get(function () {
  return this.startingPriceInCents;
});
AuctionListingSchema.virtual('minimumIncrement').get(function () {
  return this.minIncrementInCents;
});
AuctionListingSchema.virtual('currentLeadingAmount').get(function () {
  return this.currentLeadingBidInCents;
});

AuctionListingSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
});

AuctionListingSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

AuctionListingSchema.virtual('bids', {
  ref: 'Bid',
  localField: '_id',
  foreignField: 'listingId',
});

AuctionListingSchema.virtual('questions', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'listingId',
});

AuctionListingSchema.virtual('outcome', {
  ref: 'AuctionOutcome',
  localField: '_id',
  foreignField: 'listingId',
  justOne: true,
});

AuctionListingSchema.virtual('handover', {
  ref: 'HandoverRecord',
  localField: '_id',
  foreignField: 'listingId',
  justOne: true,
});

export const AuctionListing: Model<IAuctionListing> =
  mongoose.models.AuctionListing || mongoose.model<IAuctionListing>('AuctionListing', AuctionListingSchema);

// ==========================================
// 4. BID
// ==========================================
export interface IBid extends Document {
  listingId: mongoose.Types.ObjectId;
  bidderId: mongoose.Types.ObjectId;
  amountInCents: number;
  bidType: 'MANUAL' | 'AUTO_PROXY' | 'AI_CONFIRMED';
  idempotencyKey?: string;
  acceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BidSchema = new Schema<IBid>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    bidderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountInCents: { type: Number, required: true },
    bidType: { type: String, enum: ['MANUAL', 'AUTO_PROXY', 'AI_CONFIRMED'], default: 'MANUAL' },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    acceptedAt: { type: Date, default: Date.now, index: true },
  },
  defaultSchemaOptions
);

BidSchema.index({ listingId: 1, acceptedAt: -1 });
BidSchema.index({ listingId: 1, amountInCents: -1 });
BidSchema.index({ bidderId: 1, acceptedAt: -1 });

BidSchema.virtual('amount').get(function () {
  return this.amountInCents;
});
BidSchema.virtual('bidder', {
  ref: 'User',
  localField: 'bidderId',
  foreignField: '_id',
  justOne: true,
});
BidSchema.virtual('listing', {
  ref: 'AuctionListing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});

export const Bid: Model<IBid> = mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema);

// ==========================================
// 5. AUTO BID LIMIT
// ==========================================
export interface IAutoBidLimit extends Document {
  listingId: mongoose.Types.ObjectId;
  bidderId: mongoose.Types.ObjectId;
  maxLimitInCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutoBidLimitSchema = new Schema<IAutoBidLimit>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    bidderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    maxLimitInCents: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  defaultSchemaOptions
);

AutoBidLimitSchema.index({ listingId: 1, bidderId: 1 }, { unique: true });

AutoBidLimitSchema.virtual('maximumAmount').get(function () {
  return this.maxLimitInCents;
});
AutoBidLimitSchema.virtual('bidder', {
  ref: 'User',
  localField: 'bidderId',
  foreignField: '_id',
  justOne: true,
});
AutoBidLimitSchema.virtual('listing', {
  ref: 'AuctionListing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});

export const AutoBidLimit: Model<IAutoBidLimit> =
  mongoose.models.AutoBidLimit || mongoose.model<IAutoBidLimit>('AutoBidLimit', AutoBidLimitSchema);

// ==========================================
// 6. AUCTION OUTCOME
// ==========================================
export interface IAuctionOutcome extends Document {
  listingId: mongoose.Types.ObjectId;
  winnerId?: mongoose.Types.ObjectId;
  finalAmountInCents: number;
  sellerDecision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TIMED_OUT';
  rejectionReason?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuctionOutcomeSchema = new Schema<IAuctionOutcome>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, unique: true, index: true },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    finalAmountInCents: { type: Number, required: true },
    sellerDecision: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'TIMED_OUT'], default: 'PENDING' },
    rejectionReason: { type: String },
    decidedAt: { type: Date },
  },
  defaultSchemaOptions
);

AuctionOutcomeSchema.virtual('outcome').get(function () {
  return this.sellerDecision;
});
AuctionOutcomeSchema.virtual('winningAmount').get(function () {
  return this.finalAmountInCents;
});
AuctionOutcomeSchema.virtual('finalizedAt').get(function () {
  return this.decidedAt;
});
AuctionOutcomeSchema.virtual('winner', {
  ref: 'User',
  localField: 'winnerId',
  foreignField: '_id',
  justOne: true,
});
AuctionOutcomeSchema.virtual('listing', {
  ref: 'AuctionListing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});

export const AuctionOutcome: Model<IAuctionOutcome> =
  mongoose.models.AuctionOutcome || mongoose.model<IAuctionOutcome>('AuctionOutcome', AuctionOutcomeSchema);

// ==========================================
// 7. HANDOVER RECORD
// ==========================================
export interface IHandoverRecord extends Document {
  listingId: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  buyerId?: mongoose.Types.ObjectId;
  handoverStatus: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'FAILED';
  pickupNotes?: string;
  qrCodeToken?: string;
  handoverCode?: string;
  qrExpiresAt?: Date;
  scannedAt?: Date;
  scannedBy?: mongoose.Types.ObjectId;
  verificationMethod?: 'QR_SCAN' | 'MANUAL_CODE' | 'LEGACY';
  location?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HandoverRecordSchema = new Schema<IHandoverRecord>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, unique: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    handoverStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'DISPUTED', 'FAILED'], default: 'PENDING', index: true },
    pickupNotes: { type: String },
    qrCodeToken: { type: String, index: true },
    handoverCode: { type: String, index: true },
    qrExpiresAt: { type: Date },
    scannedAt: { type: Date },
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationMethod: { type: String, enum: ['QR_SCAN', 'MANUAL_CODE', 'LEGACY'], default: 'QR_SCAN' },
    location: { type: String },
    completedAt: { type: Date },
  },
  defaultSchemaOptions
);

HandoverRecordSchema.virtual('status').get(function () {
  return this.handoverStatus;
});
HandoverRecordSchema.virtual('pickupDetails').get(function () {
  return this.pickupNotes;
});

export const HandoverRecord: Model<IHandoverRecord> =
  mongoose.models.HandoverRecord || mongoose.model<IHandoverRecord>('HandoverRecord', HandoverRecordSchema);

// ==========================================
// 7B. SELLER REVIEW & REPUTATION (TRUST SCORE)
// ==========================================
export interface ISellerReview extends Document {
  listingId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  overallRating: number; // 1 to 5
  itemAccuracyRating: number; // 1 to 5
  communicationRating: number; // 1 to 5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SellerReviewSchema = new Schema<ISellerReview>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    itemAccuracyRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    communicationRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    comment: { type: String, trim: true },
  },
  defaultSchemaOptions
);

SellerReviewSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });

SellerReviewSchema.virtual('buyer', {
  ref: 'User',
  localField: 'buyerId',
  foreignField: '_id',
  justOne: true,
});

export const SellerReview: Model<ISellerReview> =
  mongoose.models.SellerReview || mongoose.model<ISellerReview>('SellerReview', SellerReviewSchema);

// ==========================================
// 7C. PICKUP APPOINTMENT
// ==========================================
export interface IPickupAppointment extends Document {
  listingId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  slotTime: Date;
  locationName: string;
  locationDetails?: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED';
  bookedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PickupAppointmentSchema = new Schema<IPickupAppointment>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slotTime: { type: Date, required: true, index: true },
    locationName: { type: String, required: true },
    locationDetails: { type: String },
    status: {
      type: String,
      enum: ['PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'],
      default: 'PROPOSED',
      index: true,
    },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  defaultSchemaOptions
);

PickupAppointmentSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
});

PickupAppointmentSchema.virtual('buyer', {
  ref: 'User',
  localField: 'buyerId',
  foreignField: '_id',
  justOne: true,
});

export const PickupAppointment: Model<IPickupAppointment> =
  mongoose.models.PickupAppointment || mongoose.model<IPickupAppointment>('PickupAppointment', PickupAppointmentSchema);

// ==========================================
// 8. QUESTION & ANSWER
// ==========================================
export interface IAnswer {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IQuestion extends Document {
  listingId: mongoose.Types.ObjectId;
  askerId: mongoose.Types.ObjectId;
  content: string;
  isModerated: boolean;
  answers: IAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    askerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    isModerated: { type: Boolean, default: false },
    answers: [
      {
        sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  defaultSchemaOptions
);

QuestionSchema.virtual('question').get(function () {
  return this.content;
});
QuestionSchema.virtual('asker', {
  ref: 'User',
  localField: 'askerId',
  foreignField: '_id',
  justOne: true,
});
QuestionSchema.virtual('listing', {
  ref: 'AuctionListing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

// ==========================================
// 9. SAVED LISTING
// ==========================================
export interface ISavedListing extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SavedListingSchema = new Schema<ISavedListing>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  defaultSchemaOptions
);

SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const SavedListing: Model<ISavedListing> =
  mongoose.models.SavedListing || mongoose.model<ISavedListing>('SavedListing', SavedListingSchema);

// ==========================================
// 10. SAVED SEARCH
// ==========================================
export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  query?: string;
  categoryId?: mongoose.Types.ObjectId;
  minPriceInCents?: number;
  maxPriceInCents?: number;
  condition?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    minPriceInCents: { type: Number },
    maxPriceInCents: { type: Number },
    condition: { type: String },
    isActive: { type: Boolean, default: true },
  },
  defaultSchemaOptions
);

export const SavedSearch: Model<ISavedSearch> =
  mongoose.models.SavedSearch || mongoose.model<ISavedSearch>('SavedSearch', SavedSearchSchema);

// ==========================================
// 11. NOTIFICATION
// ==========================================
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  defaultSchemaOptions
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

// ==========================================
// 12. DISPUTE
// ==========================================
export interface IDispute extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId?: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  category: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'UNDER_REVIEW' | 'WAITING_FOR_INFORMATION' | 'RESOLVED' | 'REJECTED';
  assignedAdminId?: mongoose.Types.ObjectId;
  internalNotes?: string;
  resolutionReason?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing' },
    category: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION', 'RESOLVED', 'REJECTED'],
      default: 'OPEN',
      index: true,
    },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    internalNotes: { type: String },
    resolutionReason: { type: String },
    resolvedAt: { type: Date },
  },
  defaultSchemaOptions
);

DisputeSchema.virtual('reporter', {
  ref: 'User',
  localField: 'reporterId',
  foreignField: '_id',
  justOne: true,
});
DisputeSchema.virtual('reportedUser', {
  ref: 'User',
  localField: 'reportedUserId',
  foreignField: '_id',
  justOne: true,
});
DisputeSchema.virtual('listing', {
  ref: 'AuctionListing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});
DisputeSchema.virtual('assignedAdmin', {
  ref: 'User',
  localField: 'assignedAdminId',
  foreignField: '_id',
  justOne: true,
});

export const Dispute: Model<IDispute> =
  mongoose.models.Dispute || mongoose.model<IDispute>('Dispute', DisputeSchema);

// ==========================================
// 13. AUDIT LOG
// ==========================================
export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string;
  entityType?: string;
  entityId?: string;
  payload?: any;
  reason?: string;
  previousValues?: any;
  newValues?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: String },
    entityType: { type: String },
    entityId: { type: String },
    payload: { type: Schema.Types.Mixed },
    reason: { type: String },
    previousValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    ...defaultSchemaOptions,
    timestamps: false,
  }
);

AuditLogSchema.virtual('actor', {
  ref: 'User',
  localField: 'actorId',
  foreignField: '_id',
  justOne: true,
});

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// ==========================================
// 14. ADMIN SETTING
// ==========================================
export interface IAdminSetting extends Document {
  key: string;
  value: string;
  updatedBy?: string;
  updatedAt: Date;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    updatedBy: { type: String },
  },
  defaultSchemaOptions
);

export const AdminSetting: Model<IAdminSetting> =
  mongoose.models.AdminSetting || mongoose.model<IAdminSetting>('AdminSetting', AdminSettingSchema);

// ==========================================
// 15. AUCTION EVENT
// ==========================================
export interface IAuctionEvent extends Document {
  listingId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  eventType: string;
  payload?: any;
  details?: any;
  createdAt: Date;
}

const AuctionEventSchema = new Schema<IAuctionEvent>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'AuctionListing', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  {
    ...defaultSchemaOptions,
    timestamps: false,
  }
);

export const AuctionEvent: Model<IAuctionEvent> =
  mongoose.models.AuctionEvent || mongoose.model<IAuctionEvent>('AuctionEvent', AuctionEventSchema);

// ==========================================
// 16. IDEMPOTENCY RECORD
// ==========================================
export interface IIdempotencyRecord extends Document {
  userId?: mongoose.Types.ObjectId;
  key: string;
  requestHash?: string;
  response?: any;
  status: string;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    key: { type: String, required: true, index: true },
    requestHash: { type: String },
    response: { type: Schema.Types.Mixed },
    status: { type: String, default: 'COMPLETED' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    ...defaultSchemaOptions,
    timestamps: false,
  }
);

IdempotencyRecordSchema.index({ userId: 1, key: 1 }, { unique: true });

export const IdempotencyRecord: Model<IIdempotencyRecord> =
  mongoose.models.IdempotencyRecord || mongoose.model<IIdempotencyRecord>('IdempotencyRecord', IdempotencyRecordSchema);

// ==========================================
// 17. OUTBOX EVENT
// ==========================================
export interface IOutboxEvent extends Document {
  eventType: string;
  aggregateId: string;
  payload?: any;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    eventType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'], default: 'PENDING', index: true },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: true },
    processedAt: { type: Date },
  },
  {
    ...defaultSchemaOptions,
    timestamps: false,
  }
);

export const OutboxEvent: Model<IOutboxEvent> =
  mongoose.models.OutboxEvent || mongoose.model<IOutboxEvent>('OutboxEvent', OutboxEventSchema);
