import { Property, Investment, Payout, Settings } from '../models/index.js';
import { ensure, ApiError } from '../utils/ApiError.js';
import { integer, percent } from '../utils/money.js';
import * as ledger from './ledger.service.js';
import * as notifications from './notification.service.js';
export function computePayouts(salePrice, platformFeePct, totalUnits, allocations) {
  integer(salePrice);
  integer(totalUnits);
  ensure(
    allocations.length > 0 && allocations.reduce((sum, a) => sum + a.units, 0) === totalUnits,
    500,
    'PAYOUT_ASSERTION_FAILED',
    'Ownership must account for every unit'
  );
  const platformFee = percent(salePrice, platformFeePct),
    distributable = salePrice - platformFee;
  const items = allocations.map((a) => ({
    investorId: a.investorId,
    investorName: a.investorName,
    units: a.units,
    ownershipPct: (a.units / totalUnits) * 100,
    createdAt: a.createdAt,
    payoutAmount: Number((BigInt(distributable) * BigInt(integer(a.units))) / BigInt(totalUnits)),
  }));
  const ordered = [...items].sort(
    (a, b) =>
      b.units - a.units ||
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0) ||
      String(a.investorId).localeCompare(String(b.investorId))
  );
  const remainder = distributable - items.reduce((sum, item) => sum + item.payoutAmount, 0);
  ordered[0].payoutAmount += remainder;
  const check = items.reduce((sum, item) => sum + item.payoutAmount, 0) === distributable;
  ensure(check, 500, 'PAYOUT_ASSERTION_FAILED');
  return {
    salePrice,
    platformFee,
    distributable,
    items: items.map(({ createdAt: _createdAt, ...item }) => ({
      ...item,
      amount: item.payoutAmount,
    })),
    check,
  };
}
async function distribution(id, salePrice, session) {
  const property = await Property.findById(id).session(session || null);
  ensure(property, 404, 'NOT_FOUND');
  ensure(
    property.status === 'HOLDING',
    409,
    'INVALID_TRANSITION',
    'Only holding properties can be sold'
  );
  const investments = await Investment.find({ propertyId: id, status: 'ACTIVE' })
    .populate('investorId', 'name')
    .session(session || null)
    .sort({ createdAt: 1, _id: 1 });
  const groups = new Map();
  for (const inv of investments) {
    const key = String(inv.investorId._id);
    const group = groups.get(key) || {
      investorId: inv.investorId._id,
      investorName: inv.investorId.name,
      units: 0,
      createdAt: inv.createdAt,
    };
    group.units += inv.units;
    groups.set(key, group);
  }
  const settings = await Settings.findById('platform').session(session || null);
  return {
    property,
    investments,
    preview: computePayouts(salePrice, settings.platformFeePct, property.totalUnits, [
      ...groups.values(),
    ]),
  };
}
export async function previewPayout(id, salePrice) {
  return (await distribution(id, salePrice)).preview;
}
export async function executePayout(id, salePrice, adminId) {
  try {
    return await ledger.transact(async (session) => {
      ensure(!(await Payout.exists({ propertyId: id }).session(session)), 409, 'ALREADY_SOLD');
      const { property, investments, preview } = await distribution(id, salePrice, session);
      const [payout] = await Payout.create(
        [{ propertyId: id, ...preview, executedBy: adminId, executedAt: new Date() }],
        { session }
      );
      for (const item of preview.items) {
        if (item.payoutAmount)
          await ledger.post({
            userId: item.investorId,
            type: 'PAYOUT',
            direction: 'CREDIT',
            amount: item.payoutAmount,
            refType: 'Payout',
            refId: payout._id,
            session,
          });
        // Split the investor's aggregate payout across their investment lots without losing paise.
        const lots = investments.filter(
          (inv) => String(inv.investorId._id) === String(item.investorId)
        );
        let remainder = item.payoutAmount;
        for (let i = 0; i < lots.length; i++) {
          const lot = lots[i];
          lot.payoutAmount =
            i === lots.length - 1
              ? remainder
              : Number((BigInt(item.payoutAmount) * BigInt(lot.units)) / BigInt(item.units));
          remainder -= lot.payoutAmount;
          lot.status = 'EXITED';
          await lot.save({ session });
        }
        await notifications.create({
          userId: item.investorId,
          type: 'PAYOUT_CREDITED',
          title: 'Sale payout received',
          body: `${property.title} was sold. ₹${(item.payoutAmount / 100).toLocaleString('en-IN')} was credited to your wallet.`,
          link: '/investor/wallet',
          session,
        });
      }
      if (preview.platformFee)
        await ledger.post({
          userId: adminId,
          type: 'FEE',
          direction: 'CREDIT',
          amount: preview.platformFee,
          refType: 'Payout',
          refId: payout._id,
          session,
        });
      property.status = 'SOLD';
      property.salePrice = salePrice;
      property.soldAt = new Date();
      await property.save({ session });
      return payout;
    });
  } catch (error) {
    if (error.code === 11000 && (await Payout.exists({ propertyId: id })))
      throw new ApiError(409, 'ALREADY_SOLD');
    throw error;
  }
}
