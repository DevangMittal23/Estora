import { Property, Enquiry } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
export async function create(investorId, propertyId, message) {
  const property = await Property.findById(propertyId);
  ensure(property, 404, 'NOT_FOUND');
  ensure(['LIVE', 'FUNDED', 'HOLDING', 'SOLD'].includes(property.status), 403, 'FORBIDDEN');
  return Enquiry.create({
    investorId,
    propertyId,
    brokerId: property.brokerId,
    messages: [{ from: investorId, text: message }],
  });
}
export function list(user, query) {
  return paginate(
    Enquiry,
    {
      [user.role === 'INVESTOR' ? 'investorId' : 'brokerId']: user._id,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    },
    query,
    {
      populate: [
        { path: 'propertyId', select: 'title city' },
        { path: 'messages.from', select: 'name role' },
      ],
    }
  );
}
export async function reply(id, user, text) {
  const item = await Enquiry.findById(id);
  ensure(item, 404, 'NOT_FOUND');
  ensure(
    (user.role === 'INVESTOR' && String(item.investorId) === String(user._id)) ||
      (['BROKER', 'ADMIN'].includes(user.role) && String(item.brokerId) === String(user._id)),
    403,
    'FORBIDDEN'
  );
  return Enquiry.findByIdAndUpdate(
    id,
    { $push: { messages: { from: user._id, text, at: new Date() } } },
    { new: true }
  );
}
