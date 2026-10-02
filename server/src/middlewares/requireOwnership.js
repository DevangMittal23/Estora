import { Property } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const requireOwnership = asyncHandler(async (req, _res, next) => {
  req.property = await Property.findById(req.params.id);
  ensure(req.property, 404, 'NOT_FOUND');
  ensure(
    req.user.role === 'ADMIN' || String(req.property.brokerId) === String(req.user._id),
    403,
    'FORBIDDEN'
  );
  next();
});
