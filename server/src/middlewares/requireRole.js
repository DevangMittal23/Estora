import { ensure } from '../utils/ApiError.js';
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    try {
      ensure(roles.includes(req.user.role), 403, 'FORBIDDEN');
      if (req.user.role === 'BROKER')
        ensure(
          req.user.brokerApproved,
          403,
          'BROKER_NOT_APPROVED',
          'Your broker account is awaiting approval'
        );
      next();
    } catch (error) {
      next(error);
    }
  };
