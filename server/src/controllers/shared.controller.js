import * as kyc from '../services/kyc.service.js';
import * as portfolio from '../services/portfolio.service.js';
import * as enquiries from '../services/enquiry.service.js';
import * as notifications from '../services/notification.service.js';
import * as media from '../services/media.service.js';
import { endpoint } from './response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const submitKyc = endpoint(
  async (r) => ({ kyc: await kyc.submit(r.user._id, r.files) }),
  200,
  'KYC submitted'
);
export const summary = endpoint((r) => portfolio.summary(r.user._id));
export const createEnquiry = endpoint(
  async (r) => ({ enquiry: await enquiries.create(r.user._id, r.body.propertyId, r.body.message) }),
  201,
  'Enquiry sent'
);
export const listEnquiries = endpoint((r) => enquiries.list(r.user, r.query));
export const replyEnquiry = endpoint(
  async (r) => ({ enquiry: await enquiries.reply(r.params.id, r.user, r.body.text) }),
  200,
  'Reply sent'
);
export const listNotifications = endpoint((r) => notifications.list(r.user._id, r.query));
export const readNotification = endpoint(async (r) => ({
  notification: await notifications.markRead(r.params.id, r.user._id),
}));
export const readAll = endpoint((r) => notifications.markAllRead(r.user._id));
export const getMedia = asyncHandler(async (req, res) => {
  const file = await media.getFile(req.params.id, req.user);
  res
    .set({
      'Content-Type': file.mime,
      'Content-Disposition': `${file.mime.startsWith('image/') ? 'inline' : 'attachment'}; filename="${file.name}"`,
      'Cache-Control': 'private, no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    })
    .send(file.data);
});
