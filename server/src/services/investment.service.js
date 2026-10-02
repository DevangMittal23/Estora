import { User, Property, Investment, Settings } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { multiply, percent } from '../utils/money.js';
import { paginate } from '../utils/pagination.js';
import * as ledger from './ledger.service.js';
import * as notifications from './notification.service.js';
import { withFunding } from './property.service.js';
async function existingResult(existing, userId, session) {
  ensure(
    String(existing.investorId) === String(userId),
    409,
    'IDEMPOTENCY_KEY_TAKEN',
    'Use a new idempotency key'
  );
  const property = await Property.findById(existing.propertyId).session(session || null);
  const user = await User.findById(userId).session(session || null);
  return {
    investment: existing,
    property: withFunding(property),
    walletBalance: user.walletBalance,
    replayed: true,
  };
}
export async function invest(userId, { propertyId, units, idempotencyKey }) {
  try {
    return await ledger.transact(async (session) => {
      const existing = await Investment.findOne({ idempotencyKey }).session(session);
      if (existing) return existingResult(existing, userId, session);
      const property = await Property.findById(propertyId).session(session);
      ensure(property, 404, 'NOT_FOUND');
      ensure(
        property.status === 'LIVE',
        409,
        property.unitsSold === property.totalUnits ? 'INSUFFICIENT_UNITS' : 'INVALID_TRANSITION',
        'This property is not accepting investments'
      );
      const user = await User.findById(userId).session(session);
      ensure(user?.role === 'INVESTOR', 403, 'FORBIDDEN');
      ensure(
        user.kyc.status === 'APPROVED',
        403,
        'KYC_NOT_APPROVED',
        'Complete KYC before investing'
      );
      ensure(user.isActive, 401, 'ACCOUNT_DEACTIVATED');
      ensure(
        units >= property.minUnits,
        400,
        'MIN_UNITS_NOT_MET',
        `Choose at least ${property.minUnits} units`
      );
      ensure(
        units <= property.totalUnits - property.unitsSold,
        409,
        'INSUFFICIENT_UNITS',
        `Only ${property.totalUnits - property.unitsSold} units remain`
      );
      const prior = await Investment.find({
        propertyId,
        investorId: userId,
        status: 'ACTIVE',
      }).session(session);
      const existingUnits = prior.reduce((sum, inv) => sum + inv.units, 0);
      const settings = await Settings.findById('platform').session(session);
      const cap = Math.min(
        property.maxUnitsPerInvestor,
        percent(property.totalUnits, settings.maxOwnershipPct)
      );
      ensure(
        existingUnits + units <= cap,
        400,
        'MAX_UNITS_EXCEEDED',
        `Your ownership limit is ${cap} units`
      );
      const amount = multiply(units, property.unitPrice);
      ensure(
        user.walletBalance >= amount,
        400,
        'INSUFFICIENT_BALANCE',
        'Add money to your wallet before investing'
      );
      const updated = await Property.findOneAndUpdate(
        { _id: propertyId, status: 'LIVE', unitsSold: { $lte: property.totalUnits - units } },
        { $inc: { unitsSold: units } },
        { new: true, session }
      );
      ensure(updated, 409, 'INSUFFICIENT_UNITS');
      const [investment] = await Investment.create(
        [{ investorId: userId, propertyId, units, amount, idempotencyKey }],
        { session }
      );
      const entry = await ledger.post({
        userId,
        type: 'INVESTMENT',
        direction: 'DEBIT',
        amount,
        refType: 'Investment',
        refId: investment._id,
        session,
      });
      if (updated.unitsSold === updated.totalUnits) {
        updated.status = 'FUNDED';
        updated.fundedAt = new Date();
        await updated.save({ session });
        const commission = percent(updated.valuation, settings.brokerCommissionPct);
        if (commission)
          await ledger.post({
            userId: updated.brokerId,
            type: 'COMMISSION',
            direction: 'CREDIT',
            amount: commission,
            refType: 'Property',
            refId: updated._id,
            session,
          });
        const investors = await Investment.distinct('investorId', {
          propertyId,
          status: 'ACTIVE',
        }).session(session);
        for (const recipient of [updated.brokerId, ...investors])
          await notifications.create({
            userId: recipient,
            type: 'PROPERTY_FUNDED',
            title: 'Property fully funded',
            body: `${updated.title} has reached 100% funding.`,
            link: `/properties/${propertyId}`,
            session,
          });
      }
      return {
        investment,
        property: withFunding(updated),
        walletBalance: entry.balanceAfter,
        replayed: false,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Investment.findOne({ idempotencyKey });
      if (existing) return existingResult(existing, userId);
    }
    throw error;
  }
}
export async function list(userId, query) {
  const result = await paginate(Investment, { investorId: userId }, query, {
    populate: { path: 'propertyId' },
  });
  result.items = result.items.map((inv) => ({
    ...inv,
    propertyId: inv.propertyId._id,
    property: withFunding(inv.propertyId),
    ownershipPct: (inv.units / inv.propertyId.totalUnits) * 100,
    fundingPct: (inv.propertyId.unitsSold / inv.propertyId.totalUnits) * 100,
  }));
  return result;
}
