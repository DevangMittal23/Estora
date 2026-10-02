import mongoose from 'mongoose';
const { Schema } = mongoose;
const reference = (model) => ({ type: Schema.Types.ObjectId, ref: model, required: true });
const money = (defaultValue) => ({
  type: Number,
  min: 0,
  validate: Number.isSafeInteger,
  ...(defaultValue === undefined ? { required: true } : { default: defaultValue }),
});
const positive = { type: Number, min: 1, validate: Number.isSafeInteger };
const options = { timestamps: true };
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'BROKER', 'INVESTOR'], required: true },
    isActive: { type: Boolean, default: true },
    brokerApproved: { type: Boolean, default: false },
    walletBalance: money(0),
    kyc: {
      status: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_SUBMITTED',
      },
      docs: [String],
      reason: String,
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  options
);
userSchema.index({ role: 1 });
userSchema.set('toJSON', {
  transform: (_doc, obj) => {
    delete obj.passwordHash;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
  },
});
export const User = mongoose.model('User', userSchema);
const media = new Schema({ url: String, publicId: String, name: String }, { _id: false });
export const statuses = [
  'DRAFT',
  'PENDING_APPROVAL',
  'LIVE',
  'FUNDED',
  'HOLDING',
  'SOLD',
  'REJECTED',
  'CANCELLED',
];
const propertySchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['APARTMENT', 'VILLA', 'COMMERCIAL', 'PLOT', 'WAREHOUSE'] },
    address: String,
    city: String,
    state: String,
    pincode: String,
    geo: { lat: Number, lng: Number },
    areaSqft: Number,
    images: [media],
    documents: [media],
    valuation: money(0),
    totalUnits: { ...positive, default: 1 },
    unitPrice: money(0),
    minUnits: { ...positive, default: 1 },
    maxUnitsPerInvestor: { ...positive, default: 1 },
    unitsSold: money(0),
    expectedAppreciationPct: { type: Number, default: 0 },
    rentalYieldPct: { type: Number, default: 0 },
    holdingPeriodMonths: { ...positive, default: 12 },
    status: { type: String, enum: statuses, default: 'DRAFT' },
    rejectionReason: String,
    brokerId: reference('User'),
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    salePrice: { type: Number, min: 0, validate: Number.isSafeInteger },
    liveAt: Date,
    fundedAt: Date,
    soldAt: Date,
    savedStep: { type: Number, default: 0 },
  },
  options
);
propertySchema.index({ status: 1, city: 1 });
propertySchema.index({ brokerId: 1 });
export const Property = mongoose.model('Property', propertySchema);
const investmentSchema = new Schema(
  {
    investorId: reference('User'),
    propertyId: reference('Property'),
    units: { ...positive, required: true },
    amount: money(),
    status: { type: String, enum: ['ACTIVE', 'EXITED', 'REFUNDED'], default: 'ACTIVE' },
    payoutAmount: money(0),
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  options
);
investmentSchema.index({ investorId: 1, propertyId: 1 });
investmentSchema.index({ propertyId: 1 });
export const Investment = mongoose.model('Investment', investmentSchema);
const transactionSchema = new Schema(
  {
    userId: reference('User'),
    type: {
      type: String,
      enum: ['TOPUP', 'INVESTMENT', 'PAYOUT', 'REFUND', 'COMMISSION', 'WITHDRAWAL', 'FEE'],
      required: true,
    },
    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: money(),
    balanceAfter: money(),
    refType: String,
    refId: Schema.Types.ObjectId,
    gatewayPaymentId: { type: String, unique: true, sparse: true },
  },
  options
);
transactionSchema.index({ userId: 1, createdAt: -1 });
// Financial history cannot be rewritten through the application model.
for (const method of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
])
  transactionSchema.pre(method, function () {
    throw new Error('Ledger is append-only');
  });
transactionSchema.pre('save', function () {
  if (!this.isNew) throw new Error('Ledger is append-only');
});
export const Transaction = mongoose.model('Transaction', transactionSchema);
const payoutSchema = new Schema(
  {
    propertyId: { ...reference('Property'), unique: true },
    salePrice: money(),
    platformFee: money(),
    distributable: money(),
    items: [
      {
        investorId: reference('User'),
        investorName: String,
        units: Number,
        ownershipPct: Number,
        amount: money(),
        payoutAmount: money(),
      },
    ],
    executedBy: reference('User'),
    executedAt: { type: Date, default: Date.now },
  },
  options
);
export const Payout = mongoose.model('Payout', payoutSchema);
const withdrawalSchema = new Schema(
  {
    userId: reference('User'),
    amount: money(),
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    bankDetails: { accountName: String, accountNumber: String, ifsc: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  options
);
withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: 1 });
export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
const enquirySchema = new Schema(
  {
    propertyId: reference('Property'),
    investorId: reference('User'),
    brokerId: reference('User'),
    messages: [
      {
        from: reference('User'),
        text: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  },
  options
);
enquirySchema.index({ investorId: 1 });
enquirySchema.index({ brokerId: 1 });
export const Enquiry = mongoose.model('Enquiry', enquirySchema);
const notificationSchema = new Schema(
  {
    userId: reference('User'),
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
  },
  options
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);
export const Settings = mongoose.model(
  'Settings',
  new Schema(
    {
      _id: { type: String, default: 'platform' },
      platformFeePct: { type: Number, default: 2 },
      brokerCommissionPct: { type: Number, default: 1 },
      maxOwnershipPct: { type: Number, default: 49 },
    },
    options
  )
);
// Gateway orders are stored server-side: verification never trusts a client-supplied amount or owner.
export const TopupOrder = mongoose.model(
  'TopupOrder',
  new Schema(
    {
      userId: reference('User'),
      orderId: { type: String, unique: true, required: true },
      amount: money(),
      currency: { type: String, default: 'INR' },
      mode: { type: String, enum: ['mock', 'razorpay'] },
      status: { type: String, enum: ['CREATED', 'PAID'], default: 'CREATED' },
    },
    options
  )
);
export const Media = mongoose.model(
  'Media',
  new Schema(
    {
      userId: reference('User'),
      propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
      private: { type: Boolean, default: true },
      data: { type: Buffer, select: false },
      cloudPublicId: String,
      cloudResourceType: String,
      mime: String,
      name: String,
    },
    options
  )
);
export const models = [
  User,
  Property,
  Investment,
  Transaction,
  Payout,
  Withdrawal,
  Enquiry,
  Notification,
  Settings,
  TopupOrder,
  Media,
];
