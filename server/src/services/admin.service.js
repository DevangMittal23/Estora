import { User, Property, Transaction, Settings } from '../models/index.js';
import { paginate, escapeRegex } from '../utils/pagination.js';
import { ensure } from '../utils/ApiError.js';
export async function stats() {
  // Calendar month follows the product's India time zone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === 'year').value),
    month = Number(parts.find((p) => p.type === 'month').value);
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 330 * 60000);
  const [
    aum,
    roles,
    statuses,
    raised,
    fees,
    series,
    propertiesPending,
    kycPending,
    brokersPending,
  ] = await Promise.all([
    Property.aggregate([
      { $match: { status: { $in: ['LIVE', 'FUNDED', 'HOLDING'] } } },
      { $group: { _id: null, amount: { $sum: '$valuation' } } },
    ]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Property.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Transaction.aggregate([
      { $match: { type: 'INVESTMENT', direction: 'DEBIT', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'FEE', direction: 'CREDIT' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'INVESTMENT', direction: 'DEBIT' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Property.countDocuments({ status: 'PENDING_APPROVAL' }),
    User.countDocuments({ role: 'INVESTOR', 'kyc.status': 'PENDING' }),
    User.countDocuments({ role: 'BROKER', brokerApproved: false }),
  ]);
  const usersByRole = { ADMIN: 0, BROKER: 0, INVESTOR: 0 };
  roles.forEach((r) => (usersByRole[r._id] = r.count));
  return {
    totalAUM: aum[0]?.amount || 0,
    usersByRole,
    totalUsers: roles.reduce((sum, r) => sum + r.count, 0),
    livePropertiesCount: statuses.find((s) => s._id === 'LIVE')?.count || 0,
    fundsRaisedThisMonth: raised[0]?.amount || 0,
    platformFeesEarned: fees[0]?.amount || 0,
    propertiesByStatus: statuses.map((s) => ({ status: s._id, count: s.count })),
    fundsRaisedOverTime: series.map((s) => ({ month: s._id, amount: s.amount })),
    pendingApprovals: { properties: propertiesPending, kyc: kycPending, brokers: brokersPending },
  };
}
export function users(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.kycStatus) filter['kyc.status'] = query.kycStatus;
  if (query.search) {
    const re = new RegExp(escapeRegex(String(query.search).slice(0, 100)), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  return paginate(User, filter, query);
}
export async function updateUser(id, data, adminId) {
  ensure(
    !(String(id) === String(adminId) && data.isActive === false),
    403,
    'FORBIDDEN',
    'You cannot deactivate your own account'
  );
  const user = await User.findById(id);
  ensure(user, 404, 'NOT_FOUND');
  ensure(!('brokerApproved' in data) || user.role === 'BROKER', 400, 'INVALID_ROLE');
  return User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
}
export const getSettings = () => Settings.findById('platform');
export const updateSettings = (data) =>
  Settings.findByIdAndUpdate('platform', { $set: data }, { new: true, runValidators: true });
export function kycQueue(query) {
  return paginate(
    User,
    { role: 'INVESTOR', 'kyc.status': 'PENDING' },
    { ...query, sort: 'createdAt' }
  );
}
export async function brokerStats(userId) {
  const [properties, commission] = await Promise.all([
    Property.find({ brokerId: userId }).lean(),
    Transaction.find({ userId, type: 'COMMISSION', direction: 'CREDIT' }).lean(),
  ]);
  return {
    totalProperties: properties.length,
    liveProperties: properties.filter((p) => p.status === 'LIVE').length,
    fundedProperties: properties.filter((p) => ['FUNDED', 'HOLDING', 'SOLD'].includes(p.status))
      .length,
    totalRaised: properties.reduce((sum, p) => sum + p.unitsSold * p.unitPrice, 0),
    commissionEarned: commission.reduce((sum, t) => sum + t.amount, 0),
    pendingApprovals: properties.filter((p) => p.status === 'PENDING_APPROVAL').length,
  };
}
export async function publicStats() {
  const [raised, investors, totalProperties] = await Promise.all([
    Transaction.aggregate([
      { $match: { type: 'INVESTMENT', direction: 'DEBIT' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: 'INVESTOR' }),
    Property.countDocuments({ status: { $in: ['LIVE', 'FUNDED', 'HOLDING', 'SOLD'] } }),
  ]);
  return { totalRaised: raised[0]?.amount || 0, investors, totalProperties };
}
