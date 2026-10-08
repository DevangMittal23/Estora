import mongoose from 'mongoose';
import { Property, Investment } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { getPagination } from '../utils/pagination.js';
import { escapeRegex } from '../utils/pagination.js';

const published = { status: { $in: ['LIVE', 'FUNDED'] } };
const fields = '_id title description type address city state pincode geo areaSqft images valuation totalUnits unitPrice minUnits unitsSold expectedAppreciationPct rentalYieldPct holdingPeriodMonths status updatedAt liveAt fundedAt';

// An explicit read-only projection. No broker, investor, document, approval,
// payment, wallet or internal lifecycle fields can enter the SEO response.
export async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { ...published };
  if (query.city) filter.city = new RegExp(`^${escapeRegex(String(query.city).slice(0, 100))}$`, 'i');
  if (query.status && ['LIVE', 'FUNDED'].includes(query.status)) filter.status = query.status;
  const [items, total] = await Promise.all([
    Property.find(filter).select(fields).sort(query.sort === '-createdAt' ? { createdAt: -1, _id: 1 } : { _id: 1 }).skip(skip).limit(limit).lean(),
    Property.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function detail(id) {
  ensure(mongoose.isValidObjectId(id), 404, 'NOT_FOUND');
  const property = await Property.findOne({ ...published, _id: id }).select(fields).lean();
  ensure(property, 404, 'NOT_FOUND');
  const investors = await Investment.distinct('investorId', { propertyId: id, status: 'ACTIVE' });
  return { ...property, investorCount: investors.length };
}
