import { Router } from 'express';
import * as c from '../controllers/shared.controller.js';
import * as property from '../controllers/property.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as wallet from '../controllers/wallet.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import { enquirySchema, replySchema } from '../validators/index.js';
const router = Router();
router.get('/stats', admin.publicStats);
router.get('/broker/properties', authenticate, requireRole('BROKER'), property.own);
router.get('/broker/stats', authenticate, requireRole('BROKER'), admin.brokerStats);
router.get('/transactions', authenticate, wallet.transactions);
router.get('/portfolio/summary', authenticate, requireRole('INVESTOR'), c.summary);
router.post(
  '/kyc',
  authenticate,
  requireRole('INVESTOR'),
  upload.array('documents', 2),
  c.submitKyc
);
router.get('/enquiries', authenticate, requireRole('INVESTOR', 'BROKER', 'ADMIN'), c.listEnquiries);
router.post(
  '/enquiries',
  authenticate,
  requireRole('INVESTOR'),
  validate(enquirySchema),
  c.createEnquiry
);
router.post(
  '/enquiries/:id/reply',
  authenticate,
  requireRole('INVESTOR', 'BROKER', 'ADMIN'),
  validate(replySchema),
  c.replyEnquiry
);
router.get('/notifications', authenticate, c.listNotifications);
router.patch('/notifications/read-all', authenticate, c.readAll);
router.patch('/notifications/:id/read', authenticate, c.readNotification);
router.get('/media/:id', optionalAuthenticate, c.getMedia);
export default router;
