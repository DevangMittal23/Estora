import { Notification } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
export async function create({ userId, type, title, body, link, session }) {
  const [item] = await Notification.create([{ userId, type, title, body, link }], { session });
  return item;
}
export async function list(userId, query) {
  const [result, unreadCount] = await Promise.all([
    paginate(Notification, { userId }, query),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { ...result, unreadCount };
}
export async function markRead(id, userId) {
  const item = await Notification.findById(id);
  ensure(item, 404, 'NOT_FOUND');
  ensure(String(item.userId) === String(userId), 403, 'FORBIDDEN');
  return Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { read: true } },
    { new: true }
  );
}
export async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  return { unreadCount: 0 };
}
