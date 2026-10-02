import * as service from '../services/admin.service.js';
import * as wallet from '../services/wallet.service.js';
import * as kyc from '../services/kyc.service.js';
import { endpoint } from './response.js';
export const stats = endpoint(() => service.stats());
export const users = endpoint((r) => service.users(r.query));
export const updateUser = endpoint(async (r) => ({
  user: await service.updateUser(r.params.id, r.body, r.user._id),
}));
export const settings = endpoint(() => service.getSettings());
export const updateSettings = endpoint(
  async (r) => ({ settings: await service.updateSettings(r.body) }),
  200,
  'Settings saved'
);
export const withdrawals = endpoint((r) => wallet.pendingWithdrawals(r.query));
export const reviewWithdrawal = endpoint(async (r) => ({
  withdrawal: await wallet.processWithdrawal(r.params.id, r.user._id, r.body.status),
}));
export const kycQueue = endpoint((r) => service.kycQueue(r.query));
export const reviewKyc = endpoint(async (r) => ({
  user: await kyc.review(r.params.userId, r.body.status, r.body.reason),
}));
export const brokerStats = endpoint((r) => service.brokerStats(r.user._id));
export const publicStats = endpoint(() => service.publicStats());
