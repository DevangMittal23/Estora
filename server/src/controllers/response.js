import { asyncHandler } from '../utils/asyncHandler.js';
// Controllers translate HTTP inputs/outputs only; business logic remains in services.
export const endpoint = (fn, status = 200, message = 'Success') =>
  asyncHandler(async (req, res) => {
    const data = await fn(req);
    res.status(status).json({ success: true, data: data ?? null, message });
  });
