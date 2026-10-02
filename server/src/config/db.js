import mongoose from 'mongoose';
import { env } from './env.js';
import { models, Settings } from '../models/index.js';
export async function connectDB() {
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid')
    throw new Error('MongoDB must be a replica set to support financial transactions');
  await Promise.all(models.map((model) => model.init()));
  await Settings.findOneAndUpdate(
    { _id: 'platform' },
    {
      $setOnInsert: {
        platformFeePct: env.PLATFORM_FEE_PCT,
        brokerCommissionPct: env.BROKER_COMMISSION_PCT,
        maxOwnershipPct: env.MAX_OWNERSHIP_PCT,
      },
    },
    { upsert: true, new: true }
  );
}
