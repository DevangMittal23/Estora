import * as service from '../services/auth.service.js';
import { endpoint } from './response.js';
export const register = endpoint(
  async (r) => ({ user: await service.register(r.body) }),
  201,
  'Account created'
);
export const login = endpoint(
  (r) => service.login(r.body.email, r.body.password),
  200,
  'Welcome back'
);
export const me = endpoint((r) => r.user);
export const logout = endpoint(() => null, 200, 'Logged out');
export const updateProfile = endpoint((r) => service.updateProfile(r.user._id, r.body));
export const changePassword = endpoint(
  (r) => service.changePassword(r.user._id, r.body.currentPassword, r.body.password),
  200,
  'Password updated'
);
export const forgotPassword = endpoint(
  (r) => service.forgotPassword(r.body.email),
  200,
  'If that account exists, a reset link has been sent'
);
export const resetPassword = endpoint(
  (r) => service.resetPassword(r.params.token, r.body.password),
  200,
  'Password updated'
);
