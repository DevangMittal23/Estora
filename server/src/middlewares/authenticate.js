import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError, ensure } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const authenticate = asyncHandler(async (req, _res, next) => {
  let decoded;
  try {
    decoded = jwt.verify(
      (req.headers.authorization || '').replace(/^Bearer /, ''),
      env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue');
  }
  ensure(
    typeof decoded.userId === 'string' && /^[a-f\d]{24}$/i.test(decoded.userId),
    401,
    'UNAUTHORIZED'
  );
  req.user = await User.findById(decoded.userId);
  ensure(req.user, 401, 'UNAUTHORIZED');
  ensure(req.user.isActive, 401, 'ACCOUNT_DEACTIVATED');
  next();
});
export const optionalAuthenticate = (req, res, next) =>
  req.headers.authorization ? authenticate(req, res, next) : next();
