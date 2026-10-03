import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { registerSchema } from '../validators/index.js';
import { ensure } from '../utils/ApiError.js';

const schema = registerSchema.omit({ role: true }).strict();

async function existingAdmin(user, password) {
  ensure(
    user?.role === 'ADMIN',
    409,
    'EMAIL_TAKEN',
    'This email belongs to another account. Choose an unused admin email.'
  );
  ensure(user.isActive, 409, 'ACCOUNT_DEACTIVATED', 'This admin account is deactivated.');
  ensure(
    await bcrypt.compare(password, user.passwordHash),
    409,
    'ADMIN_ALREADY_EXISTS',
    'This admin already exists with another password. Use password recovery or an unused email; its password was not changed.'
  );
  return { created: false, email: user.email };
}

// This is invoked only by the administrative CLI, never by a public route.
export async function provisionAdmin(input) {
  const data = schema.parse(input);
  const existing = await User.findOne({ email: data.email }).select('+passwordHash');
  if (existing) return existingAdmin(existing, data.password);

  try {
    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'ADMIN',
      isActive: true,
      passwordHash: await bcrypt.hash(data.password, env.BCRYPT_ROUNDS),
    });
    return { created: true, email: user.email };
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Concurrent provisioning must not overwrite an account created first.
    return existingAdmin(
      await User.findOne({ email: data.email }).select('+passwordHash'),
      data.password
    );
  }
}
