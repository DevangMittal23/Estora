import * as service from '../services/wallet.service.js';
import * as ledger from '../services/ledger.service.js';
import { endpoint } from './response.js';
export const wallet = endpoint((r) => service.getWallet(r.user._id));
export const order = endpoint((r) => service.createOrder(r.user._id, r.body.amount));
export const verify = endpoint(
  (r) => service.verifyTopup(r.user._id, r.body),
  200,
  'Wallet credited'
);
export const withdraw = endpoint(
  async (r) => ({
    withdrawal: await service.createWithdrawal(r.user._id, r.body.amount, r.body.bankDetails),
  }),
  201,
  'Withdrawal requested'
);
export const ownWithdrawals = endpoint((r) => service.ownWithdrawals(r.user._id, r.query));
export const transactions = endpoint((r) => ledger.list(r.user, r.query));
