import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { send, useAction, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Field, Success } from '../../components/ui';
import { homeFor } from '../../utils';
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/\d/, 'Include a number.')
  .max(128, 'Use at most 128 characters.')
  .regex(/[^a-zA-Z0-9\s]/, 'Include a symbol.');
const emailSchema = z.string().email('Enter a valid email address.');
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  email: emailSchema,
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Enter a valid phone number.'),
  password: passwordSchema,
  role: z.enum(['INVESTOR', 'BROKER']),
});
export function AuthPage({ mode = 'login' }) {
  const { token } = useParams();
  return <AuthForm key={`${mode}:${token || ''}`} mode={mode} />;
}
function AuthForm({ mode }) {
  const navigate = useNavigate(),
    location = useLocation(),
    { token: resetToken } = useParams();
  const { login } = useAuth();
  const [visible, setVisible] = useState(false),
    [done, setDone] = useState(false);
  const isSignup = mode === 'signup',
    isReset = mode === 'reset',
    isForgot = mode === 'forgot';
  const schema = isSignup
    ? signupSchema
    : isForgot
      ? z.object({ email: emailSchema })
      : isReset
        ? z
            .object({ password: passwordSchema, confirm: z.string() })
            .refine((v) => v.password === v.confirm, {
              message: 'Passwords must match.',
              path: ['confirm'],
            })
        : z.object({
            email: emailSchema,
            password: z.string().min(1, 'Enter your password.'),
          });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      role:
        new URLSearchParams(location.search).get('role') === 'broker'
          ? 'BROKER'
          : 'INVESTOR',
    },
  });
  const action = useAction(
    async (data) => {
      if (isSignup) {
        await send('post', '/auth/register', data);
        navigate('/login');
      } else if (isForgot) {
        await send('post', '/auth/forgot-password', data);
        setDone(true);
      } else if (isReset) {
        await send('post', `/auth/reset-password/${resetToken}`, {
          password: data.password,
        });
        setDone(true);
      } else {
        const result = await send('post', '/auth/login', data);
        login(result.token, result.user);
        const from = location.state?.from;
        const allowed = from?.startsWith(`/${result.user.role.toLowerCase()}`);
        navigate(allowed ? from : homeFor(result.user));
      }
    },
    isSignup
      ? 'Your account is ready. Please log in.'
      : isReset
        ? 'Password updated'
        : isForgot
          ? null
          : 'Welcome back'
  );
  const title = isSignup
    ? 'A little share. A bigger future.'
    : isForgot
      ? 'Let’s get you back in.'
      : isReset
        ? 'Create a fresh start.'
        : 'Welcome back.';
  return (
    <section className="auth-page">
      <aside className="auth-story">
        <span className="eyebrow">A considered approach to real estate</span>
        <h2>
          Great properties.
          <br />
          Shared possibilities.
        </h2>
        <img
          src="/assets/estora-residences.webp"
          alt="Illustrative contemporary residences"
        />
        <small className="auth-image-label">
          Concept architecture · Illustrative
        </small>
        <div className="auth-note">
          <ShieldCheck size={22} />
          <p>
            Choose a property. Own your units.
            <br />
            Track your share through to sale.
          </p>
        </div>
      </aside>
      <div className="auth-form">
        <span className="eyebrow">
          {isSignup
            ? 'Start your journey'
            : isForgot || isReset
              ? 'Account recovery'
              : 'Your ESTORA account'}
        </span>
        <h1>{title}</h1>
        <p>
          {isSignup
            ? 'Join as an investor or bring exceptional properties to the platform.'
            : isForgot
              ? 'Enter your email and we’ll send you a password reset link.'
              : isReset
                ? 'Use at least 8 characters, a number and a symbol.'
                : 'Log in to see your portfolio and the possibilities ahead.'}
        </p>
        <p className="auth-demo-note">
          Academic demo · Test funds and dummy documents only.
        </p>
        {done ? (
          <Success
            title={isForgot ? 'Check your inbox' : 'Password updated'}
            description={
              isForgot
                ? 'If an account exists for this email, you’ll receive a reset link. The link expires in one hour.'
                : 'You can now log in with your new password.'
            }
            action={
              <Link className="button primary" to="/login">
                Back to login
              </Link>
            }
          />
        ) : (
          <form onSubmit={handleSubmit(action.mutate)} noValidate>
            {isSignup && (
              <>
                <div
                  className="role-toggle"
                  role="group"
                  aria-label="Account type"
                >
                  {['INVESTOR', 'BROKER'].map((role) => (
                    <label
                      key={role}
                      className={watch('role') === role ? 'selected' : ''}
                    >
                      <input type="radio" value={role} {...register('role')} />
                      {role === 'INVESTOR' ? 'I’m an investor' : 'I’m a broker'}
                    </label>
                  ))}
                </div>
                <Field
                  label="Full name"
                  autoComplete="name"
                  {...register('name')}
                  error={errors.name?.message}
                />
                <Field
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              </>
            )}
            {!isReset && (
              <Field
                label="Email address"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
            )}{' '}
            {!isForgot && (
              <Field
                label={isReset ? 'New password' : 'Password'}
                error={errors.password?.message}
                help={
                  isSignup ? '8+ characters, one number and one symbol' : null
                }
              >
                <div className="password-input">
                  <input
                    type={visible ? 'text' : 'password'}
                    autoComplete={
                      isSignup || isReset ? 'new-password' : 'current-password'
                    }
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            )}
            {isReset && (
              <Field
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                {...register('confirm')}
                error={errors.confirm?.message}
              />
            )}{' '}
            {mode === 'login' && (
              <Link className="forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            )}
            {action.isError && (
              <p className="danger" role="alert">
                {errorMessage(action.error)}
              </p>
            )}
            <Button
              loading={action.isPending}
              className="full-width"
              type="submit"
            >
              {isSignup
                ? 'Create account'
                : isForgot
                  ? 'Send reset link'
                  : isReset
                    ? 'Update password'
                    : 'Log in'}
              <ArrowRight size={17} />
            </Button>
          </form>
        )}
        {!isForgot && !isReset && (
          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to ESTORA?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
