import { z } from 'zod';
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource ID');
export const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/\d/, 'Include a digit')
  .regex(/[^a-zA-Z0-9\s]/, 'Include a symbol');
const text = z.string().trim().min(1).max(10000);
export const registerSchema = z.object({
  name: text.max(100),
  email: z
    .string()
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/),
  password,
  role: z.enum(['INVESTOR', 'BROKER']),
});
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((x) => x.toLowerCase()),
  password: z.string().min(1).max(128),
});
const mediaSchema = z.object({
  url: z
    .string()
    .refine(
      (s) => s.startsWith('/assets/') || s.startsWith('/api/v1/media/') || /^https:\/\//.test(s),
      'Use a secure media URL'
    ),
  publicId: z.string().max(300).optional(),
  name: z.string().max(200).optional(),
});
const propertyFields = {
  title: text.max(150),
  description: text,
  type: z.enum(['APARTMENT', 'VILLA', 'COMMERCIAL', 'PLOT', 'WAREHOUSE']),
  address: text.max(300),
  city: text.max(100),
  state: text.max(100),
  pincode: z.string().regex(/^\d{6}$/),
  geo: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  areaSqft: z.number().positive().max(1e9),
  valuation: amount,
  totalUnits: amount,
  minUnits: amount,
  maxUnitsPerInvestor: amount,
  expectedAppreciationPct: z.number().min(0).max(100),
  rentalYieldPct: z.number().min(0).max(100),
  holdingPeriodMonths: z.number().int().min(1).max(1200),
  images: z.array(mediaSchema).max(20).optional(),
  documents: z.array(mediaSchema).max(10).optional(),
  savedStep: z.number().int().min(0).max(4).optional(),
  brokerId: id.optional(),
};
export const createPropertySchema = z.object(propertyFields);
export const updatePropertySchema = createPropertySchema.partial().strict();
export const draftSchema = createPropertySchema.partial().extend({ title: propertyFields.title });
export const investSchema = z.object({
  propertyId: id,
  units: amount,
  idempotencyKey: z.string().min(8).max(128),
});
export const saleSchema = z.object({ salePrice: amount });
export const rejectionSchema = z.object({ reason: z.string().trim().max(1000).optional() });
export const statusSchema = z.object({ status: z.enum(['HOLDING', 'CANCELLED']) });
export const movePropertyImageSchema = z.object({ mediaId: id }).strict();
export const verifySchema = z.object({
  razorpayOrderId: text.max(200),
  razorpayPaymentId: text.max(200),
  razorpaySignature: text.max(200),
});
export const withdrawSchema = z.object({
  amount,
  bankDetails: z.object({
    accountName: text.max(100),
    accountNumber: z.string().regex(/^\d{6,20}$/),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  }),
});
export const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(1000).optional(),
});
export const userUpdateSchema = z
  .object({ isActive: z.boolean().optional(), brokerApproved: z.boolean().optional() })
  .strict();
const rate = z
  .number()
  .min(0)
  .max(100)
  .refine((x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-7, 'Use at most two decimal places');
export const settingsSchema = z
  .object({
    platformFeePct: rate.optional(),
    brokerCommissionPct: rate.optional(),
    maxOwnershipPct: rate.refine((x) => x > 0, 'Must be positive').optional(),
  })
  .strict();
export const enquirySchema = z.object({ propertyId: id, message: text.max(2000) });
export const replySchema = z.object({ text: text.max(2000) });
export const profileSchema = z
  .object({
    name: text.max(100).optional(),
    phone: z
      .string()
      .regex(/^\+?[\d\s-]{8,20}$/)
      .optional(),
  })
  .strict();
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password,
});
