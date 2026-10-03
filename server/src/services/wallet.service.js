import crypto from 'node:crypto';
import { User, Transaction, Withdrawal, TopupOrder } from '../models/index.js';
import { env } from '../config/env.js';
import { razorpay } from '../config/razorpay.js';
import { ensure, ApiError } from '../utils/ApiError.js';
import { integer } from '../utils/money.js';
import { paginate } from '../utils/pagination.js';
import * as ledger from './ledger.service.js';
import * as notifications from './notification.service.js';
export async function getWallet(userId) {
  const [user, recentTransactions, pendingWithdrawals] = await Promise.all([
    User.findById(userId),
    Transaction.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
    Withdrawal.find({ userId, status: 'PENDING' }).lean(),
  ]);
  return {
    walletBalance: user.walletBalance,
    recentTransactions,
    pendingWithdrawals,
    paymentMode: env.PAYMENT_MODE,
  };
}
export async function createOrder(userId, amount) {
  integer(amount);
  ensure(amount <= 10000000000, 400, 'INVALID_AMOUNT', 'Maximum top-up is ₹10 crore');
  let gateway;
  try {
    gateway = razorpay
      ? await razorpay.orders.create({ amount, currency: 'INR', receipt: crypto.randomUUID() })
      : { id: `order_mock_${crypto.randomUUID()}` };
  } catch (error) {
    console.error('Razorpay order creation failed', error);
    if (error.statusCode === 400)
      throw new ApiError(
        400,
        'PAYMENT_ORDER_REJECTED',
        'The payment provider rejected this amount. Enter a smaller test amount and try again.'
      );
    throw new ApiError(
      502,
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'The payment provider could not create an order. Please try again shortly.'
    );
  }
  await TopupOrder.create({ userId, orderId: gateway.id, amount, mode: env.PAYMENT_MODE });
  return {
    orderId: gateway.id,
    amount,
    currency: 'INR',
    mode: env.PAYMENT_MODE,
    keyId: env.RAZORPAY_KEY_ID,
  };
}
export async function verifyTopup(userId, data) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
  const order = await TopupOrder.findOne({ orderId: razorpayOrderId, userId });
  ensure(order, 404, 'NOT_FOUND', 'Payment order not found');
  ensure(order.status === 'CREATED', 409, 'DUPLICATE_TOPUP');
  ensure(
    !(await Transaction.exists({ gatewayPaymentId: razorpayPaymentId })),
    409,
    'DUPLICATE_TOPUP'
  );
  if (order.mode === 'mock')
    ensure(
      env.PAYMENT_MODE === 'mock' &&
        env.NODE_ENV !== 'production' &&
        razorpaySignature === 'mock' &&
        razorpayPaymentId.startsWith('mock_'),
      400,
      'INVALID_PAYMENT_SIGNATURE'
    );
  else {
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${order.orderId}|${razorpayPaymentId}`)
      .digest();
    ensure(
      /^[a-f\d]{64}$/i.test(razorpaySignature) &&
        crypto.timingSafeEqual(expected, Buffer.from(razorpaySignature, 'hex')),
      400,
      'INVALID_PAYMENT_SIGNATURE'
    );
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    ensure(
      payment.order_id === order.orderId &&
        payment.amount === order.amount &&
        payment.currency === 'INR' &&
        payment.status === 'captured',
      400,
      'INVALID_PAYMENT_SIGNATURE',
      'Payment must be captured for the exact order amount'
    );
  }
  try {
    return await ledger.transact(async (session) => {
      const updated = await TopupOrder.findOneAndUpdate(
        { _id: order._id, userId, status: 'CREATED' },
        { $set: { status: 'PAID' } },
        { new: true, session }
      );
      ensure(updated, 409, 'DUPLICATE_TOPUP');
      const entry = await ledger.post({
        userId,
        type: 'TOPUP',
        direction: 'CREDIT',
        amount: order.amount,
        gatewayPaymentId: razorpayPaymentId,
        refType: 'TopupOrder',
        refId: order._id,
        session,
      });
      return { walletBalance: entry.balanceAfter };
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'DUPLICATE_TOPUP');
    throw error;
  }
}
export async function createWithdrawal(userId, amount, bankDetails) {
  const user = await User.findById(userId);
  ensure(
    Number.isSafeInteger(amount) && amount > 0 && amount <= user.walletBalance,
    400,
    'INVALID_WITHDRAWAL_AMOUNT'
  );
  return Withdrawal.create({ userId, amount, bankDetails });
}
export async function processWithdrawal(id, adminId, status) {
  return ledger.transact(async (session) => {
    const withdrawal = await Withdrawal.findById(id).session(session);
    ensure(withdrawal, 404, 'NOT_FOUND');
    ensure(withdrawal.status === 'PENDING', 409, 'ALREADY_PROCESSED');
    if (status === 'APPROVED')
      await ledger.post({
        userId: withdrawal.userId,
        type: 'WITHDRAWAL',
        direction: 'DEBIT',
        amount: withdrawal.amount,
        refType: 'Withdrawal',
        refId: withdrawal._id,
        session,
      });
    withdrawal.status = status;
    withdrawal.processedBy = adminId;
    await withdrawal.save({ session });
    await notifications.create({
      userId: withdrawal.userId,
      type: `WITHDRAWAL_${status}`,
      title: status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected',
      body: `Your withdrawal request has been ${status.toLowerCase()}.`,
      link: '/investor/wallet',
      session,
    });
    return withdrawal;
  });
}
export const ownWithdrawals = (userId, query) => paginate(Withdrawal, { userId }, query);
export const pendingWithdrawals = (query) =>
  paginate(
    Withdrawal,
    { status: 'PENDING' },
    { ...query, sort: 'createdAt' },
    { populate: { path: 'userId', select: 'name email' } }
  );
