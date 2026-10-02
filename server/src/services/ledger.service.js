import mongoose from 'mongoose';
import { User, Transaction } from '../models/index.js';
import { ensure, ApiError } from '../utils/ApiError.js';
import { integer } from '../utils/money.js';
import { paginate } from '../utils/pagination.js';
export const transact = (fn) =>
  mongoose.connection.transaction(fn, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary',
  });
export async function post({
  userId,
  type,
  direction,
  amount,
  refType,
  refId,
  gatewayPaymentId,
  session,
}) {
  if (!session)
    return transact((s) =>
      post({ userId, type, direction, amount, refType, refId, gatewayPaymentId, session: s })
    );
  integer(amount);
  ensure(['CREDIT', 'DEBIT'].includes(direction), 400, 'INVALID_DIRECTION');
  const filter = { _id: userId };
  if (direction === 'DEBIT') filter.walletBalance = { $gte: amount };
  else filter.walletBalance = { $lte: Number.MAX_SAFE_INTEGER - amount };
  const user = await User.findOneAndUpdate(
    filter,
    { $inc: { walletBalance: direction === 'CREDIT' ? amount : -amount } },
    { new: true, session }
  );
  ensure(
    user,
    400,
    direction === 'DEBIT' ? 'INSUFFICIENT_BALANCE' : 'BALANCE_LIMIT',
    'Wallet balance cannot support this operation'
  );
  try {
    const [entry] = await Transaction.create(
      [
        {
          userId,
          type,
          direction,
          amount,
          balanceAfter: user.walletBalance,
          refType,
          refId,
          ...(gatewayPaymentId ? { gatewayPaymentId } : {}),
        },
      ],
      { session }
    );
    return entry;
  } catch (error) {
    if (error.code === 11000 && gatewayPaymentId)
      throw new ApiError(409, 'DUPLICATE_TOPUP', 'This payment has already been credited');
    throw error;
  }
}
export async function getBalance(userId) {
  const [result] = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);
  return result?.balance || 0;
}
export function list(user, query) {
  const filter =
    user.role === 'ADMIN' ? (query.userId ? { userId: query.userId } : {}) : { userId: user._id };
  if (query.type) filter.type = query.type;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      const date = new Date(query.startDate);
      ensure(!Number.isNaN(date.getTime()), 400, 'VALIDATION_ERROR');
      filter.createdAt.$gte = date;
    }
    if (query.endDate) {
      const date = new Date(query.endDate);
      ensure(!Number.isNaN(date.getTime()), 400, 'VALIDATION_ERROR');
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) date.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = date;
    }
  }
  return paginate(Transaction, filter, query);
}
