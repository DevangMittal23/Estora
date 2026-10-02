import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const rate = (fallback) => z.coerce.number().min(0).max(100).default(fallback);
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(12).default(12),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  PAYMENT_MODE: z.enum(['mock', 'razorpay']).default('mock'),
  MEDIA_MODE: z.enum(['database', 'cloudinary']).default('database'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  EMAIL_FROM: z.string().default('noreply@estora.app'),
  RESEND_API_KEY: z.string().default(''),
  PLATFORM_FEE_PCT: rate(2),
  BROKER_COMMISSION_PCT: rate(1),
  MAX_OWNERSHIP_PCT: rate(49),
  ALLOW_SEED_RESET: z.string().default('false'),
});
export const env = schema.parse(process.env);
if (
  env.PAYMENT_MODE === 'razorpay' &&
  (!env.RAZORPAY_KEY_ID.startsWith('rzp_test_') || !env.RAZORPAY_KEY_SECRET)
)
  throw new Error('Razorpay test credentials required');
if (
  env.MEDIA_MODE === 'cloudinary' &&
  (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
)
  throw new Error('Cloudinary credentials required');
if (env.NODE_ENV === 'production' && (env.PAYMENT_MODE === 'mock' || env.MEDIA_MODE === 'database'))
  throw new Error('Production requires Razorpay test mode and Cloudinary');
