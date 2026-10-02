import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useData, useAction, send, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  QueryState,
  Button,
  Field,
  Chip,
  Empty,
  Pagination,
} from '../../components/ui';
import { date, idOf, homeFor } from '../../utils';
import { passwordSchema } from '../public/Auth';
export function Enquiries({ propertyId }) {
  const query = useData('/enquiries');
  return (
    <>
      {!propertyId && (
        <Heading
          eyebrow="A conversation about your investment"
          title="Enquiries"
          description="Ask questions, get clarity and keep the conversation in one place."
        />
      )}
      <QueryState query={query}>
        {(data) => {
          const items = data.items.filter(
            (e) => !propertyId || idOf(e.propertyId) === propertyId
          );
          return items.length ? (
            <div className="threads">
              {items.map((enquiry) => (
                <EnquiryThread key={enquiry._id} enquiry={enquiry} />
              ))}
            </div>
          ) : (
            <Empty
              title="No enquiries yet"
              description="Questions about properties and broker replies will appear here."
              action={
                !propertyId && (
                  <Link className="button primary" to="/properties">
                    Explore properties
                  </Link>
                )
              }
            />
          );
        }}
      </QueryState>
    </>
  );
}
function EnquiryThread({ enquiry: e }) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, 'Write a reply.')
          .max(2000, 'Use at most 2,000 characters.'),
      })
    ),
  });
  const action = useAction(async (values) => {
    await send('post', `/enquiries/${e._id}/reply`, values);
    reset();
  }, 'Reply sent');
  return (
    <article className="panel thread">
      <div className="between">
        <h3>
          {e.propertyId?.title || e.property?.title || 'Property enquiry'}
        </h3>
        <Chip status={e.status} />
      </div>
      {e.messages.map((message, i) => (
        <div
          className={`message ${idOf(message.from) === user._id ? 'own' : ''}`}
          key={i}
        >
          <div className="between">
            <strong>
              {idOf(message.from) === user._id
                ? 'You'
                : message.from?.name || 'Property contact'}
            </strong>
            <small>{date(message.at)}</small>
          </div>
          <p>{message.text}</p>
        </div>
      ))}
      {e.status !== 'CLOSED' && (
        <form onSubmit={handleSubmit(action.mutate)}>
          <Field label="Your reply" error={errors.text?.message}>
            <textarea {...register('text')} />
          </Field>
          <Button type="submit" loading={action.isPending}>
            Send reply
          </Button>
        </form>
      )}
    </article>
  );
}
export function Notifications() {
  const [page, setPage] = useState(1);
  const query = useData(
    '/notifications',
    { page, limit: 15 },
    { refetchInterval: 30000 }
  );
  const read = useAction(
    (id) => send('patch', `/notifications/${id}/read`),
    null
  );
  const all = useAction(
    () => send('patch', '/notifications/read-all'),
    'Notifications marked as read'
  );
  return (
    <>
      <Heading
        eyebrow="Stay in the loop"
        title="Your notifications"
        description="Approvals, funding milestones and money movements, all in one place."
        action={
          <Button
            variant="secondary"
            loading={all.isPending}
            onClick={() => all.mutate()}
          >
            Mark all as read
          </Button>
        }
      />
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <section className="panel notification-list">
                {data.items.map((n) => (
                  <article className={n.read ? '' : 'unread'} key={n._id}>
                    <span className="notification-dot" />
                    <div>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                      <small>{date(n.createdAt)}</small>
                      <div className="actions">
                        {n.link &&
                          n.link.startsWith('/') &&
                          !n.link.startsWith('//') &&
                          !n.link.includes(String.fromCharCode(92)) && (
                            <Link
                              className="text-link"
                              to={n.link}
                              onClick={() => !n.read && read.mutate(n._id)}
                            >
                              View details →
                            </Link>
                          )}
                        {!n.read && (
                          <Button
                            loading={read.isPending}
                            variant="ghost"
                            onClick={() => read.mutate(n._id)}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <Empty
                title="You’re all caught up"
                description="New notifications will appear when something changes."
              />
            )}
            <Pagination data={data} page={page} onChange={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
export function Profile() {
  const { user, refresh } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(2, 'Enter your name.'),
        phone: z
          .string()
          .regex(/^\+?\d{10,15}$/, 'Enter a valid phone number.'),
      })
    ),
    defaultValues: { name: user.name, phone: user.phone },
  });
  const action = useAction(async (values) => {
    await send('patch', '/auth/me', values);
    await refresh();
  }, 'Profile updated');
  return (
    <>
      <Heading
        eyebrow="Your account"
        title="My profile"
        description="Keep your contact details current and your account secure."
      />
      <div className="two-panels">
        <section className="panel">
          <div className="between">
            <h2>Personal information</h2>
            <Chip status={user.role} />
          </div>
          <form onSubmit={handleSubmit(action.mutate)}>
            <Field
              label="Full name"
              {...register('name')}
              error={errors.name?.message}
            />
            <Field
              label="Phone"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Field
              label="Email"
              value={user.email}
              disabled
              help="Your login email is fixed for this account."
            />
            <Button type="submit" loading={action.isPending}>
              Save profile
            </Button>
          </form>
        </section>
        <ChangePassword />
      </div>
    </>
  );
}
function ChangePassword() {
  const schema = z
    .object({
      currentPassword: z.string().min(1, 'Enter your current password.'),
      password: passwordSchema,
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      path: ['confirm'],
      message: 'Passwords must match.',
    });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const action = useAction(async (values) => {
    await send('post', '/auth/change-password', {
      currentPassword: values.currentPassword,
      password: values.password,
    });
    reset();
  }, 'Password changed');
  return (
    <section className="panel">
      <h2>Change password</h2>
      <form onSubmit={handleSubmit(action.mutate)}>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <Field
          label="Confirm new password"
          type="password"
          {...register('confirm')}
          error={errors.confirm?.message}
        />
        {action.isError && (
          <p className="danger">{errorMessage(action.error)}</p>
        )}
        <Button loading={action.isPending} type="submit">
          Update password
        </Button>
      </form>
    </section>
  );
}
export function ErrorPage({ forbidden = false }) {
  const { user } = useAuth();
  return (
    <section className="error-page">
      <span className="eyebrow">
        {forbidden ? '403 / Access restricted' : '404 / Page not found'}
      </span>
      <h1>
        {forbidden
          ? 'This space belongs to a different role.'
          : 'A turn in the wrong direction.'}
      </h1>
      <p>
        {forbidden
          ? 'Your account does not have permission to view this page.'
          : 'The page you’re looking for may have moved, or the address is incorrect.'}
      </p>
      <Link className="button primary" to={user ? homeFor(user) : '/'}>
        {user ? 'Back to my dashboard' : 'Back to home'}
      </Link>
    </section>
  );
}
