import { Router } from 'express';
import { z } from 'zod';
import * as c from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  password,
} from '../validators/index.js';
import { ApiError } from '../utils/ApiError.js';
const router = Router();
router.post(
  '/register',
  authLimiter,
  (req, _res, next) =>
    req.body.role === 'ADMIN' ? next(new ApiError(400, 'INVALID_ROLE')) : next(),
  validate(registerSchema),
  c.register
);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.get('/me', authenticate, c.me);
router.patch('/me', authenticate, validate(profileSchema), c.updateProfile);
router.post('/logout', authenticate, c.logout);
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  c.changePassword
);
router.post(
  '/forgot-password',
  authLimiter,
  validate(
    z.object({
      email: z
        .string()
        .email()
        .transform((x) => x.toLowerCase()),
    })
  ),
  c.forgotPassword
);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate(z.object({ password })),
  c.resetPassword
);
export default router;
