import rateLimit from 'express-rate-limit';
const make = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        details: [],
      },
    },
  });
export const authLimiter = make(15 * 60 * 1000, 15);
export const investLimiter = make(60 * 1000, 10);
export const apiLimiter = make(60 * 1000, 200);
