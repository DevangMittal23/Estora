import { Router } from 'express';
import * as c from '../controllers/property.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { requireOwnership } from '../middlewares/requireOwnership.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import {
  createPropertySchema,
  updatePropertySchema,
  draftSchema,
  rejectionSchema,
  statusSchema,
  saleSchema,
} from '../validators/index.js';
const router = Router(),
  owner = [authenticate, requireRole('BROKER', 'ADMIN'), requireOwnership],
  admin = [authenticate, requireRole('ADMIN')];
router.get('/', optionalAuthenticate, c.list);
router.post(
  '/',
  authenticate,
  requireRole('BROKER', 'ADMIN'),
  validate(createPropertySchema),
  c.create
);
router.post(
  '/draft',
  authenticate,
  requireRole('BROKER', 'ADMIN'),
  validate(draftSchema),
  c.createDraft
);
router.get('/:id', optionalAuthenticate, c.detail);
router.patch('/:id', ...owner, validate(updatePropertySchema), c.update);
router.post('/:id/submit', ...owner, c.submit);
router.post('/:id/approve', ...admin, c.approve);
router.post('/:id/reject', ...admin, validate(rejectionSchema), c.reject);
router.post('/:id/status', ...admin, validate(statusSchema), c.status);
router.get('/:id/payout-preview', ...admin, c.preview);
router.post('/:id/sell', ...admin, validate(saleSchema), c.sell);
router.get('/:id/investors', ...owner, c.investors);
router.post(
  '/:id/media',
  ...owner,
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'documents', maxCount: 10 },
  ]),
  c.addMedia
);
export default router;
