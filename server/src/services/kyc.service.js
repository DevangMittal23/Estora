import { User } from '../models/index.js';
import { ensure } from '../utils/ApiError.js';
import { saveFiles } from './media.service.js';
import * as ledger from './ledger.service.js';
import * as notifications from './notification.service.js';
export async function submit(userId, files) {
  const user = await User.findById(userId);
  ensure(user.kyc.status !== 'APPROVED', 409, 'KYC_ALREADY_APPROVED');
  ensure(files?.length > 0 && files.length <= 2, 400, 'INVALID_FILE');
  const docs = await saveFiles(files, userId);
  const updated = await User.findOneAndUpdate(
    { _id: userId, 'kyc.status': { $ne: 'APPROVED' } },
    { $set: { kyc: { status: 'PENDING', docs: docs.map((item) => item.url), reason: '' } } },
    { new: true }
  );
  ensure(updated, 409, 'KYC_ALREADY_APPROVED');
  return updated.kyc;
}
export async function review(userId, status, reason) {
  ensure(status !== 'REJECTED' || reason?.trim(), 400, 'REJECTION_REASON_REQUIRED');
  return ledger.transact(async (session) => {
    const user = await User.findById(userId).session(session);
    ensure(user && user.role === 'INVESTOR', 404, 'NOT_FOUND');
    ensure(
      user.kyc.status === 'PENDING',
      409,
      'INVALID_TRANSITION',
      'Only pending KYC can be reviewed'
    );
    user.kyc.status = status;
    user.kyc.reason = status === 'REJECTED' ? reason : '';
    await user.save({ session });
    await notifications.create({
      userId,
      type: `KYC_${status}`,
      title: status === 'APPROVED' ? 'KYC approved' : 'KYC needs changes',
      body: status === 'APPROVED' ? 'Your account is verified. You can now invest.' : reason,
      link: '/investor/kyc',
      session,
    });
    return user;
  });
}
