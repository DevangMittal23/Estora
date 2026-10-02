import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { seedData, disconnect } from './seed-data.js';
try {
  await connectDB();
  await seedData({ reset: env.ALLOW_SEED_RESET === 'true' });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnect();
}
