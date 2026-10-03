import { Property, User, Investment, Settings } from '../models/index.js';
import { ApiError, ensure } from '../utils/ApiError.js';
import { paginate, escapeRegex } from '../utils/pagination.js';
import { createPropertySchema } from '../validators/index.js';
import * as ledger from './ledger.service.js';
import * as notifications from './notification.service.js';
export const VALID_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['LIVE', 'REJECTED'],
  REJECTED: ['PENDING_APPROVAL'],
  LIVE: ['FUNDED', 'CANCELLED'],
  FUNDED: ['HOLDING'],
  HOLDING: ['SOLD'],
  SOLD: [],
  CANCELLED: [],
};
export function validateTransition(current, target) {
  ensure(
    VALID_TRANSITIONS[current]?.includes(target),
    409,
    'INVALID_TRANSITION',
    `Cannot move from ${current} to ${target}`
  );
}
export function withFunding(property) {
  const p = property.toObject ? property.toObject() : property;
  return { ...p, fundingPct: p.totalUnits ? (p.unitsSold / p.totalUnits) * 100 : 0 };
}
function validateFinancials(data) {
  if (data.valuation && data.totalUnits)
    ensure(
      data.valuation % data.totalUnits === 0,
      400,
      'UNIT_PRICE_NOT_INTEGER',
      'Valuation must divide evenly into units'
    );
  ensure(
    data.minUnits <= data.totalUnits &&
      data.maxUnitsPerInvestor <= data.totalUnits &&
      data.minUnits <= data.maxUnitsPerInvestor,
    400,
    'VALIDATION_ERROR',
    'Unit limits must fit the total units'
  );
}
export async function create(data, user, partial = false) {
  const clean = partial ? data : createPropertySchema.parse(data);
  const brokerId = user.role === 'ADMIN' ? clean.brokerId || user._id : user._id;
  if (clean.brokerId && user.role === 'ADMIN') {
    const broker = await User.findById(brokerId);
    ensure(
      broker && broker.role === 'BROKER' && broker.brokerApproved && broker.isActive,
      400,
      'INVALID_BROKER'
    );
  }
  const defaults = { valuation: 0, totalUnits: 1, minUnits: 1, maxUnitsPerInvestor: 1 };
  const merged = { ...defaults, ...clean };
  validateFinancials(merged);
  return Property.create({
    ...merged,
    brokerId,
    unitPrice: merged.valuation / merged.totalUnits,
    status: 'DRAFT',
    unitsSold: 0,
  });
}
export async function update(id, data, user) {
  return ledger.transact(async (session) => {
    const property = await Property.findById(id).session(session);
    ensure(property, 404, 'NOT_FOUND');
    ensure(
      user.role === 'ADMIN' || String(property.brokerId) === String(user._id),
      403,
      'FORBIDDEN'
    );
    ensure(!('brokerId' in data), 403, 'IMMUTABLE_FIELD', 'Property owner cannot be changed');
    const flexible = ['DRAFT', 'REJECTED'].includes(property.status);
    if (!flexible)
      ensure(
        Object.keys(data).every((key) => ['description', 'images'].includes(key)),
        403,
        'IMMUTABLE_FIELD',
        'Only description and images may change at this stage'
      );
    if (['valuation', 'totalUnits', 'unitPrice'].some((key) => key in data))
      ensure(
        !(await Investment.exists({ propertyId: id }).session(session)),
        403,
        'IMMUTABLE_FIELD'
      );
    const merged = { ...property.toObject(), ...data };
    validateFinancials(merged);
    Object.assign(property, data);
    property.unitPrice = merged.valuation / merged.totalUnits;
    await property.save({ session });
    return property;
  });
}
export async function submit(id) {
  return ledger.transact(async (session) => {
    const property = await Property.findById(id).session(session);
    ensure(property, 404, 'NOT_FOUND');
    validateTransition(property.status, 'PENDING_APPROVAL');
    createPropertySchema.parse({ ...property.toObject(), brokerId: String(property.brokerId) });
    validateFinancials(property);
    ensure(
      property.images.length >= 3,
      400,
      'INSUFFICIENT_IMAGES',
      'Add at least three property images'
    );
    property.status = 'PENDING_APPROVAL';
    property.rejectionReason = undefined;
    await property.save({ session });
    return property;
  });
}
export async function review(id, adminId, status, reason) {
  ensure(status !== 'REJECTED' || reason?.trim(), 400, 'REJECTION_REASON_REQUIRED');
  return ledger.transact(async (session) => {
    const property = await Property.findById(id).session(session);
    ensure(property, 404, 'NOT_FOUND');
    validateTransition(property.status, status);
    property.status = status;
    if (status === 'LIVE') {
      property.liveAt = new Date();
      property.approvedBy = adminId;
      property.rejectionReason = undefined;
    } else property.rejectionReason = reason;
    await property.save({ session });
    const owner = await User.findById(property.brokerId).select('role').session(session);
    const link =
      owner?.role === 'ADMIN'
        ? status === 'LIVE'
          ? `/properties/${id}`
          : `/admin/properties/${id}/edit`
        : `/broker/properties/${id}`;
    await notifications.create({
      userId: property.brokerId,
      type: status === 'LIVE' ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
      title: status === 'LIVE' ? 'Your property is live' : 'Property needs changes',
      body:
        status === 'LIVE'
          ? `${property.title} is approved for investment.`
          : `${property.title}: ${reason}`,
      link,
      session,
    });
    return property;
  });
}
export async function changeStatus(id, status) {
  return ledger.transact(async (session) => {
    const property = await Property.findById(id).session(session);
    ensure(property, 404, 'NOT_FOUND');
    if (status === 'CANCELLED' && property.status === 'CANCELLED')
      throw new ApiError(409, 'ALREADY_CANCELLED');
    validateTransition(property.status, status);
    if (status === 'CANCELLED') {
      const investments = await Investment.find({ propertyId: id, status: 'ACTIVE' }).session(
        session
      );
      for (const inv of investments) {
        await ledger.post({
          userId: inv.investorId,
          type: 'REFUND',
          direction: 'CREDIT',
          amount: inv.amount,
          refType: 'Investment',
          refId: inv._id,
          session,
        });
        inv.status = 'REFUNDED';
        await inv.save({ session });
      }
      property.unitsSold = 0;
    }
    property.status = status;
    await property.save({ session });
    return property;
  });
}
export async function list(query, user, own = false) {
  const filter = {};
  if (own) filter.brokerId = user._id;
  else if (user?.role === 'ADMIN') {
    if (query.brokerId) filter.brokerId = query.brokerId;
  } else filter.status = { $in: ['LIVE', 'FUNDED', 'HOLDING', 'SOLD'] };
  if (!user) filter.status = { $in: ['LIVE', 'FUNDED'] };
  if (
    query.status &&
    (own ||
      user?.role === 'ADMIN' ||
      ['LIVE', 'FUNDED', ...(user ? ['HOLDING', 'SOLD'] : [])].includes(query.status))
  )
    filter.status = query.status;
  if (query.city) filter.city = new RegExp(`^${escapeRegex(String(query.city))}$`, 'i');
  if (query.type) filter.type = query.type;
  if (query.search) {
    const regex = new RegExp(escapeRegex(String(query.search).slice(0, 100)), 'i');
    filter.$or = [{ title: regex }, { city: regex }];
  }
  for (const [key, op] of [
    ['minPrice', '$gte'],
    ['maxPrice', '$lte'],
  ])
    if (query[key] !== undefined) {
      const number = Number(query[key]);
      ensure(Number.isSafeInteger(number) && number >= 0, 400, 'VALIDATION_ERROR');
      filter.unitPrice = { ...filter.unitPrice, [op]: number };
    }
  const expr = [];
  for (const [key, op] of [
    ['fundingPctMin', '$gte'],
    ['fundingPctMax', '$lte'],
  ])
    if (query[key] !== undefined) {
      const number = Number(query[key]);
      ensure(Number.isFinite(number) && number >= 0 && number <= 100, 400, 'VALIDATION_ERROR');
      expr.push({
        [op]: [{ $multiply: [{ $divide: ['$unitsSold', '$totalUnits'] }, 100] }, number],
      });
    }
  if (expr.length) filter.$expr = { $and: expr };
  const result = await paginate(Property, filter, query, {
    sortFields: [
      'createdAt',
      'unitPrice',
      'expectedAppreciationPct',
      'valuation',
      'unitsSold',
      'title',
    ],
  });
  result.items = await Promise.all(
    result.items.map(async (p) => ({
      ...withFunding(p),
      investorCount: (
        await Investment.distinct('investorId', { propertyId: p._id, status: 'ACTIVE' })
      ).length,
    }))
  );
  return result;
}
export async function detail(id, user) {
  const property = await Property.findById(id).lean();
  ensure(property, 404, 'NOT_FOUND');
  if (['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(property.status))
    ensure(
      user?.role === 'ADMIN' ||
        (user?.role === 'BROKER' && String(user._id) === String(property.brokerId)),
      403,
      'FORBIDDEN'
    );
  const investorCount = (
    await Investment.distinct('investorId', { propertyId: id, status: 'ACTIVE' })
  ).length;
  const investments = await Investment.find({
    propertyId: id,
    status: { $in: ['ACTIVE', 'EXITED'] },
  })
    .sort({ createdAt: 1 })
    .lean();
  const days = new Map();
  for (const inv of investments) {
    const date = inv.createdAt.toISOString().slice(0, 10);
    days.set(date, (days.get(date) || 0) + inv.amount);
  }
  let running = 0;
  const fundingTimeline = [...days].map(([date, amount]) => ({
    date,
    amount: (running += amount),
  }));
  const settings = await Settings.findById('platform').lean();
  return {
    ...withFunding(property),
    investorCount,
    fundingTimeline,
    maxOwnershipPct: settings.maxOwnershipPct,
  };
}
export async function investors(id) {
  const property = await Property.findById(id).lean();
  ensure(property, 404, 'NOT_FOUND');
  const all = await Investment.find({ propertyId: id }).populate('investorId', 'name').lean();
  const groups = new Map();
  for (const inv of all) {
    const key = `${inv.investorId._id}:${inv.status}`;
    const group = groups.get(key) || {
      investorId: inv.investorId._id,
      name: inv.investorId.name,
      units: 0,
      investedAmount: 0,
      status: inv.status,
    };
    group.units += inv.units;
    group.investedAmount += inv.amount;
    groups.set(key, group);
  }
  return {
    items: [...groups.values()].map((item) => ({
      ...item,
      ownershipPct: (item.units / property.totalUnits) * 100,
    })),
  };
}
