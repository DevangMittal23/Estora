import * as service from '../services/property.service.js';
import * as payouts from '../services/payout.service.js';
import * as media from '../services/media.service.js';
import { endpoint } from './response.js';
export const list = endpoint((r) => service.list(r.query, r.user));
export const detail = endpoint((r) => service.detail(r.params.id, r.user));
export const create = endpoint(
  async (r) => ({ property: await service.create(r.body, r.user) }),
  201,
  'Draft created'
);
export const createDraft = endpoint(
  async (r) => ({ property: await service.create(r.body, r.user, true) }),
  201,
  'Draft saved'
);
export const update = endpoint(
  async (r) => ({ property: await service.update(r.params.id, r.body, r.user) }),
  200,
  'Property saved'
);
export const submit = endpoint(
  async (r) => ({ property: await service.submit(r.params.id) }),
  200,
  'Submitted for approval'
);
export const approve = endpoint(
  async (r) => ({ property: await service.review(r.params.id, r.user._id, 'LIVE') }),
  200,
  'Property approved'
);
export const reject = endpoint(
  async (r) => ({
    property: await service.review(r.params.id, r.user._id, 'REJECTED', r.body.reason),
  }),
  200,
  'Property rejected'
);
export const status = endpoint(async (r) => ({
  property: await service.changeStatus(r.params.id, r.body.status),
}));
export const own = endpoint((r) => service.list(r.query, r.user, true));
export const investors = endpoint((r) => service.investors(r.params.id));
export const preview = endpoint((r) =>
  payouts.previewPayout(r.params.id, Number(r.query.salePrice))
);
export const sell = endpoint(
  async (r) => ({ payout: await payouts.executePayout(r.params.id, r.body.salePrice, r.user._id) }),
  200,
  'Sale recorded and payouts credited'
);
export const addMedia = endpoint(
  async (r) => ({ property: await media.addPropertyMedia(r.params.id, r.user, r.files) }),
  200,
  'Media uploaded'
);
export const moveToImages = endpoint(
  async (r) => ({
    property: await media.moveToPropertyImages(r.params.id, r.user, r.body.mediaId),
  }),
  200,
  'Image added to property images'
);
