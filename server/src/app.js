import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { ApiError } from './utils/ApiError.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import auth from './routes/auth.routes.js';
import properties from './routes/property.routes.js';
import investments from './routes/investment.routes.js';
import wallet from './routes/wallet.routes.js';
import admin from './routes/admin.routes.js';
import shared from './routes/shared.routes.js';
import { z } from 'zod';
const app = express();
app.disable('x-powered-by');
// Render sits in front of the service and forwards the visitor address in
// X-Forwarded-For. Trust exactly that one proxy so rate limiting identifies
// visitors correctly without trusting arbitrary forwarded headers locally.
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(
  cors({
    origin: (origin, callback) =>
      callback(
        origin && origin !== env.CLIENT_URL ? new ApiError(403, 'ORIGIN_NOT_ALLOWED') : null,
        true
      ),
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(sanitize());
app.use((req, _res, next) => {
  try {
    z.record(z.string().max(1000)).parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
});
if (env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', (_req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'unavailable' })
);
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', auth);
app.use('/api/v1/properties', properties);
app.use('/api/v1/investments', investments);
app.use('/api/v1/wallet', wallet);
app.use('/api/v1/admin', admin);
app.use('/api/v1', shared);
app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found')));
app.use(errorHandler);
export default app;
