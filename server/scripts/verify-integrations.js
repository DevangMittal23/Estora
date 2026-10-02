import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { cloudinary } from '../src/config/cloudinary.js';

const checks = await Promise.allSettled([
  (async () => {
    try {
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: false,
        autoCreate: false,
      });
      await mongoose.connection.db.command({ ping: 1 });
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Replica set required');
      console.log('MongoDB: authenticated, ping succeeded, transactions supported.');
    } finally {
      await mongoose.disconnect();
    }
  })(),
  (async () => {
    await cloudinary.api.ping();
    console.log('Cloudinary: authenticated, ping succeeded.');
  })(),
]);
for (const [index, result] of checks.entries()) {
  if (result.status === 'rejected') {
    // Provider errors can include connection strings; print only safe categories.
    console.error(
      `${index === 0 ? 'MongoDB' : 'Cloudinary'}: verification failed (${result.reason?.code || result.reason?.http_code || result.reason?.name || 'connection error'}).`
    );
    process.exitCode = 1;
  }
}
