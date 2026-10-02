import * as service from '../services/investment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { endpoint } from './response.js';
export const invest = asyncHandler(async (req, res) => {
  const { replayed, ...data } = await service.invest(req.user._id, req.body);
  res
    .status(replayed ? 200 : 201)
    .json({
      success: true,
      data,
      message: replayed ? 'Investment already recorded' : 'Investment confirmed',
    });
});
export const list = endpoint((r) => service.list(r.user._id, r.query));
