import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { ApiError, ensure } from '../utils/ApiError.js';
export async function register(data) {
  ensure(['INVESTOR', 'BROKER'].includes(data.role), 400, 'INVALID_ROLE');
  try {
    return await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, env.BCRYPT_ROUNDS),
    });
  } catch (error) {
    if (error.code === 11000)
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    throw error;
  }
}
export async function login(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  ensure(
    user && (await bcrypt.compare(password, user.passwordHash)),
    401,
    'INVALID_CREDENTIALS',
    'Email or password is incorrect'
  );
  ensure(user.isActive, 401, 'ACCOUNT_DEACTIVATED');
  return {
    token: jwt.sign({ userId: String(user._id), role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: 'HS256',
    }),
    user: user.toJSON(),
  };
}
export async function updateProfile(userId, data) {
  return User.findByIdAndUpdate(userId, { $set: data }, { new: true, runValidators: true });
}
export async function changePassword(userId, currentPassword, password) {
  const user = await User.findById(userId).select('+passwordHash');
  ensure(
    await bcrypt.compare(currentPassword, user.passwordHash),
    400,
    'INVALID_CREDENTIALS',
    'Current password is incorrect'
  );
  user.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await user.save();
}
export async function forgotPassword(email) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 3600000);
  await user.save();
  const link = `${env.CLIENT_URL}/reset/${token}`;
  const message = {
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Reset your ESTORA password',
    text: `Reset your password: ${link}\nThis link expires in one hour.`,
  };
  try {
    if (env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Password reset email delivery failed');
    } else if (env.NODE_ENV !== 'production')
      console.log(`[Demo password reset] ${email}: ${link}`);
    else throw new Error('Email provider is not configured');
  } catch (error) {
    console.error('Password reset delivery failed:', error.message);
  }
}
export async function resetPassword(token, password) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.findOneAndUpdate(
    { resetPasswordToken: hash, resetPasswordExpires: { $gt: new Date() }, isActive: true },
    { $set: { passwordHash }, $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } },
    { new: true }
  );
  ensure(
    user,
    400,
    'INVALID_OR_EXPIRED_TOKEN',
    'This reset link is expired or has already been used'
  );
}
