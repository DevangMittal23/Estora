import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { connectDB } from '../src/config/db.js';
import { provisionAdmin } from '../src/services/admin-bootstrap.service.js';
import { ApiError } from '../src/utils/ApiError.js';

try {
  const required = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME', 'ADMIN_PHONE'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Set ${missing.join(', ')} before running admin:create.`);
  await connectDB();
  const result = await provisionAdmin({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME,
    phone: process.env.ADMIN_PHONE,
  });
  console.log(
    result.created
      ? `Admin created: ${result.email}. Sign in using the password you supplied.`
      : `Admin already exists: ${result.email}. Credentials matched; no account data changed.`
  );
} catch (error) {
  if (error instanceof ZodError)
    console.error(
      `Admin setup failed: ${error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
    );
  else if (error.name === 'MongooseServerSelectionError')
    console.error(
      'Admin setup failed: cannot connect to MongoDB. Check MONGO_URI and Atlas network access.'
    );
  else if (error instanceof ApiError || error.message?.startsWith('Set ADMIN_'))
    console.error(`Admin setup failed: ${error.message}`);
  else console.error('Admin setup failed. Check database access and the server configuration.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
