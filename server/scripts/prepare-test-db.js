import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(
  new URL('../.local/mongodb-binaries', import.meta.url)
);
await mkdir(process.env.MONGOMS_DOWNLOAD_DIR, { recursive: true });
const { MongoBinary } = await import('mongodb-memory-server');
// Download outside Jest's setup timeout, with visible progress on the first run.
await MongoBinary.getPath();
console.log('MongoDB test binary ready.');
