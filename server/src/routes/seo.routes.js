import { Router } from 'express';
import * as seo from '../controllers/seo.controller.js';

const router = Router();
router.use((_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  next();
});
router.get('/properties', seo.list);
router.get('/properties/:id', seo.detail);
export default router;
