import Razorpay from 'razorpay';
import { env } from './env.js';
export const razorpay =
  env.PAYMENT_MODE === 'razorpay'
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;
