import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import mongoose from 'mongoose';
await connectDB();
const server = app.listen(env.PORT, () => console.log(`ESTORA API listening on http://localhost:${env.PORT}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await mongoose.disconnect(); process.exit(0); }));
