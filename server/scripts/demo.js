import crypto from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// A real disposable MongoDB replica set; no mocked database or authentication.
process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(
  new URL('../.local/mongodb-binaries', import.meta.url)
);
await mkdir(process.env.MONGOMS_DOWNLOAD_DIR, { recursive: true });
const { MongoMemoryReplSet } = await import('mongodb-memory-server');
const repl = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
});
process.env.MONGO_URI = repl.getUri('estora_demo');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = 'development';
process.env.PAYMENT_MODE = 'mock';
process.env.MEDIA_MODE = 'database';
process.env.BCRYPT_ROUNDS = '10';
const { connectDB } = await import('../src/config/db.js');
const { seedData, disconnect } = await import('./seed-data.js');
const { default: app } = await import('../src/app.js');
await connectDB();
await seedData();
const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () =>
  console.log(
    `ESTORA demo API: http://localhost:${port}\nDisposable MongoDB replica set. Data resets when demo stops. Payments are mock.`
  )
);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await disconnect();
      await repl.stop();
      process.exit(0);
    });
  });
