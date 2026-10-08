import { jest, beforeAll, afterAll, describe, test, expect } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import fc from 'fast-check';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.BCRYPT_ROUNDS = '10';
process.env.PAYMENT_MODE = 'mock';
process.env.MEDIA_MODE = 'database';
process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(
  new URL('../.local/mongodb-binaries', import.meta.url)
);
let repl, app, m, ledger, props, investment, payout, jwt, tokens, users;
const unique = () => crypto.randomUUID();
let n = 0;
const json = (result) => result.body.data;
const api = (method, path, role = 'investor') =>
  request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${tokens[role]}`);
async function newInvestor(balance = 1000000) {
  const user = await m.User.create({
    name: 'Test investor',
    email: `pbt${n++}@example.com`,
    phone: '9876543210',
    passwordHash: 'not-used-for-login',
    role: 'INVESTOR',
    kyc: { status: 'APPROVED' },
  });
  if (balance)
    await ledger.post({ userId: user._id, type: 'TOPUP', direction: 'CREDIT', amount: balance });
  return user;
}
async function newProperty({ units = 1000, price = 100, status = 'LIVE', cap = units } = {}) {
  return m.Property.create({
    title: `Test property ${n++}`,
    description: 'A complete property for lifecycle testing',
    type: 'APARTMENT',
    address: '12 Test Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    areaSqft: 1000,
    valuation: units * price,
    totalUnits: units,
    unitPrice: price,
    minUnits: 1,
    maxUnitsPerInvestor: cap,
    brokerId: users.broker._id,
    status,
    expectedAppreciationPct: 10,
    rentalYieldPct: 3,
    holdingPeriodMonths: 24,
    images: [1, 2, 3].map((i) => ({ url: `/assets/property-${i}.svg` })),
  });
}
beforeAll(async () => {
  await mkdir(process.env.MONGOMS_DOWNLOAD_DIR, { recursive: true });
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = repl.getUri('estora_test');
  ({ default: app } = await import('../src/app.js'));
  m = await import('../src/models/index.js');
  ledger = await import('../src/services/ledger.service.js');
  props = await import('../src/services/property.service.js');
  investment = await import('../src/services/investment.service.js');
  payout = await import('../src/services/payout.service.js');
  ({ default: jwt } = await import('jsonwebtoken'));
  const { connectDB } = await import('../src/config/db.js');
  await connectDB();
  const bcrypt = (await import('bcrypt')).default;
  const hash = await bcrypt.hash('Test@123', 10);
  users = {};
  for (const role of ['ADMIN', 'BROKER', 'INVESTOR'])
    users[role.toLowerCase()] = await m.User.create({
      name: role,
      email: `${role.toLowerCase()}@test.dev`,
      phone: '9876543210',
      role,
      brokerApproved: true,
      passwordHash: hash,
      kyc: { status: 'APPROVED' },
    });
  tokens = Object.fromEntries(
    Object.entries(users).map(([name, user]) => [
      name,
      jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET),
    ])
  );
  await ledger.post({
    userId: users.investor._id,
    type: 'TOPUP',
    direction: 'CREDIT',
    amount: 1000000,
  });
}, 180000);
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
describe('Public SEO property projection', () => {
  test('only published records are public, even when an administrator supplies a token', async () => {
    const live = await newProperty({ status: 'LIVE' });
    const funded = await newProperty({ status: 'FUNDED' });
    const hidden = [];
    for (const status of ['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'HOLDING', 'SOLD', 'CANCELLED']) hidden.push(await newProperty({ status }));
    await m.Property.updateOne({ _id: live._id }, { $set: {
      brokerId: users.broker._id,
      approvedBy: users.admin._id,
      rejectionReason: 'Confidential review notes',
      savedStep: 3,
      documents: [{ url: '/private-document', name: 'Confidential document' }],
    } });
    const listed = await api('get', '/seo/properties?limit=100', 'admin').expect(200);
    const ids = json(listed).items.map((item) => item._id);
    expect(ids).toContain(String(live._id));
    expect(ids).toContain(String(funded._id));
    for (const property of hidden) expect(ids).not.toContain(String(property._id));
    const detail = await request(app).get(`/api/v1/seo/properties/${live._id}`).expect(200);
    for (const field of ['brokerId', 'approvedBy', 'rejectionReason', 'savedStep', 'documents', 'investors', 'walletBalance']) expect(json(detail)).not.toHaveProperty(field);
    expect(detail.headers['x-robots-tag']).toBe('noindex');
    for (const property of hidden) await request(app).get(`/api/v1/seo/properties/${property._id}`).expect(404);
    await request(app).get('/api/v1/seo/properties/not-an-id').expect(404);
    const city = await request(app).get('/api/v1/seo/properties?city=Pune').expect(200);
    expect(json(city).items.every((item) => item.city === 'Pune')).toBe(true);
    expect(await m.Property.findById(live._id).then((item) => item.rejectionReason)).toBe('Confidential review notes');
  });
});

describe('Deployed admin provisioning', () => {
  const credentials = {
    name: 'Deployment admin',
    email: 'deployment-admin@test.dev',
    phone: '9876543210',
    password: 'PrivateSetup@456',
  };
  test('CLI creates a login-capable admin and preserves existing database records', async () => {
    const originalUsers = await m.User.countDocuments();
    const originalTransactions = await m.Transaction.countDocuments();
    const originalProperties = await m.Property.countDocuments();
    const output = execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../scripts/create-admin.js', import.meta.url))],
      {
        env: {
          ...process.env,
          ADMIN_EMAIL: credentials.email,
          ADMIN_PASSWORD: credentials.password,
          ADMIN_NAME: credentials.name,
          ADMIN_PHONE: credentials.phone,
        },
        encoding: 'utf8',
        timeout: 30000,
      }
    );
    expect(output).toContain(`Admin created: ${credentials.email}`);
    expect(output).not.toContain(credentials.password);
    expect(await m.User.countDocuments()).toBe(originalUsers + 1);
    expect(await m.Transaction.countDocuments()).toBe(originalTransactions);
    expect(await m.Property.countDocuments()).toBe(originalProperties);
    const response = await request(app).post('/api/v1/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });
    expect(response.status).toBe(200);
    expect(json(response).user.role).toBe('ADMIN');
    expect(json(response).user.walletBalance).toBe(0);
    expect(json(response).user.passwordHash).toBeUndefined();
  });
  test('repeat setup never overwrites the password or reactivates an admin', async () => {
    const { provisionAdmin } = await import('../src/services/admin-bootstrap.service.js');
    const before = await m.User.findOne({ email: credentials.email }).select('+passwordHash');
    expect(
      await provisionAdmin({ ...credentials, email: credentials.email.toUpperCase() })
    ).toEqual({ created: false, email: credentials.email });
    await expect(
      provisionAdmin({ ...credentials, password: 'Different@123' })
    ).rejects.toMatchObject({ code: 'ADMIN_ALREADY_EXISTS' });
    await m.User.findByIdAndUpdate(before._id, { isActive: false });
    await expect(provisionAdmin(credentials)).rejects.toMatchObject({
      code: 'ACCOUNT_DEACTIVATED',
    });
    const after = await m.User.findById(before._id).select('+passwordHash');
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.isActive).toBe(false);
  });
  test('setup refuses to promote an existing investor account', async () => {
    const { provisionAdmin } = await import('../src/services/admin-bootstrap.service.js');
    const before = await m.User.findById(users.investor._id).select('+passwordHash').lean();
    await expect(provisionAdmin({ ...credentials, email: before.email })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
    const after = await m.User.findById(before._id).select('+passwordHash').lean();
    expect(after).toEqual(before);
  });
  test('setup enforces password policy and concurrent retries create only one admin', async () => {
    const { provisionAdmin } = await import('../src/services/admin-bootstrap.service.js');
    const data = { ...credentials, email: 'concurrent-admin@test.dev' };
    await expect(provisionAdmin({ ...data, password: 'weak' })).rejects.toMatchObject({
      name: 'ZodError',
    });
    expect(await m.User.exists({ email: data.email })).toBeNull();
    const results = await Promise.all([provisionAdmin(data), provisionAdmin(data)]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await m.User.countDocuments({ email: data.email })).toBe(1);
  });
});
describe('HTTP authorization, validation and account workflows', () => {
  test('health, readiness, registration and login', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/ready')).status).toBe(200);
    const body = {
      name: 'New user',
      email: 'new@test.dev',
      phone: '9876543210',
      role: 'INVESTOR',
      password: 'Test@123',
    };
    const created = await request(app).post('/api/v1/auth/register').send(body);
    expect(created.status).toBe(201);
    expect(json(created).user.passwordHash).toBeUndefined();
    expect((await request(app).post('/api/v1/auth/register').send(body)).body.error.code).toBe(
      'EMAIL_TAKEN'
    );
    expect(
      (
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...body, role: 'ADMIN' })
      ).body.error.code
    ).toBe('INVALID_ROLE');
    expect(
      (
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...body, password: 'weak' })
      ).status
    ).toBe(400);
    const logged = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password });
    expect(logged.status).toBe(200);
    expect(jwt.verify(json(logged).token, process.env.JWT_SECRET).userId).toBe(
      json(created).user._id
    );
    expect(json(logged).user.passwordHash).toBeUndefined();
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email: body.email, password: 'wrong' }))
        .body.error.code
    ).toBe('INVALID_CREDENTIALS');
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    expect((await api('get', '/auth/me')).status).toBe(200);
  });
  test('database role, activity and broker approval are enforced on every request', async () => {
    expect((await api('get', '/admin/stats')).status).toBe(403);
    await m.User.findByIdAndUpdate(users.investor._id, { isActive: false });
    expect((await api('get', '/wallet')).body.error.code).toBe('ACCOUNT_DEACTIVATED');
    await m.User.findByIdAndUpdate(users.investor._id, { isActive: true });
    await m.User.findByIdAndUpdate(users.broker._id, { brokerApproved: false });
    expect((await api('get', '/broker/properties', 'broker')).body.error.code).toBe(
      'BROKER_NOT_APPROVED'
    );
    await m.User.findByIdAndUpdate(users.broker._id, { brokerApproved: true });
    expect(
      (await api('patch', `/admin/users/${users.admin._id}`, 'admin').send({ isActive: false }))
        .status
    ).toBe(403);
    expect(
      (await request(app).get('/health').set('Origin', 'https://untrusted.example')).status
    ).toBe(403);
  });
  test('partial draft persists, validation blocks submission, role and ownership guard private data', async () => {
    const created = await api('post', '/properties/draft', 'broker').send({
      title: 'Wizard draft',
      description: 'A property draft',
      type: 'APARTMENT',
      savedStep: 1,
    });
    expect(created.status).toBe(201);
    const id = json(created).property._id;
    expect((await request(app).get(`/api/v1/properties/${id}`)).status).toBe(403);
    expect((await api('post', `/properties/${id}/submit`, 'broker')).status).toBe(400);
    expect(
      (await api('patch', `/properties/${id}`, 'broker').send({ status: 'LIVE' })).status
    ).toBe(400);
    expect((await api('post', `/properties/${id}/approve`)).status).toBe(403);
    expect((await api('get', '/properties?status=DRAFT', 'admin')).status).toBe(200);
    const publicList = await request(app).get('/api/v1/properties?status=DRAFT');
    expect(json(publicList).items.every((p) => ['LIVE', 'FUNDED'].includes(p.status))).toBe(true);
  });
  test('full create validates exact unit price, and property review needs a reason', async () => {
    const base = (await newProperty({ status: 'DRAFT' })).toObject();
    delete base._id;
    delete base.status;
    delete base.unitPrice;
    delete base.brokerId;
    delete base.unitsSold;
    delete base.__v;
    delete base.createdAt;
    delete base.updatedAt;
    expect(
      (await api('post', '/properties', 'broker').send({ ...base, valuation: 100001 })).body.error
        .code
    ).toBe('UNIT_PRICE_NOT_INTEGER');
    const created = await api('post', '/properties', 'broker').send(base);
    expect(created.status).toBe(201);
    const id = json(created).property._id;
    expect((await api('post', `/properties/${id}/submit`, 'broker')).status).toBe(200);
    expect(
      (await api('post', `/properties/${id}/reject`, 'admin').send({ reason: '' })).body.error.code
    ).toBe('REJECTION_REASON_REQUIRED');
    expect(
      (await api('post', `/properties/${id}/reject`, 'admin').send({ reason: 'Update images' }))
        .status
    ).toBe(200);
    expect((await api('post', `/properties/${id}/submit`, 'broker')).status).toBe(200);
    expect((await api('post', `/properties/${id}/approve`, 'admin')).status).toBe(200);
    expect(
      (await api('patch', `/properties/${id}`, 'broker').send({ valuation: 200000 })).body.error
        .code
    ).toBe('IMMUTABLE_FIELD');
    expect(
      (await api('patch', `/properties/${id}`, 'broker').send({ description: 'Updated overview' }))
        .status
    ).toBe(200);
  });
  test('documents do not count as gallery images; complete submission reaches the admin queue once', async () => {
    const property = await newProperty({ status: 'DRAFT' });
    await m.Property.updateOne({ _id: property._id }, { images: [property.images[0]] });
    const path = `/properties/${property._id}`;
    const jpeg = Buffer.from([255, 216, 255, 224, 0, 0]);
    const uploaded = await api('post', `${path}/media`, 'broker')
      .attach('documents', jpeg, { filename: 'support-one.jpg', contentType: 'image/jpeg' })
      .attach('documents', jpeg, { filename: 'support-two.jpg', contentType: 'image/jpeg' });
    expect(uploaded.status).toBe(200);
    expect(json(uploaded).property.images).toHaveLength(1);
    expect(json(uploaded).property.documents).toHaveLength(2);
    expect((await api('post', `${path}/submit`, 'broker')).body.error.code).toBe(
      'INSUFFICIENT_IMAGES'
    );
    const notificationFilter = {
      type: 'PROPERTY_SUBMITTED',
      body: `${property.title} has been submitted for review.`,
    };
    expect(await m.Notification.countDocuments(notificationFilter)).toBe(0);
    expect((await m.Property.findById(property._id)).status).toBe('DRAFT');
    const images = await api('post', `${path}/media`, 'broker')
      .attach('images', jpeg, { filename: 'gallery-two.jpg', contentType: 'image/jpeg' })
      .attach('images', jpeg, { filename: 'gallery-three.jpg', contentType: 'image/jpeg' });
    expect(images.status).toBe(200);
    expect(json(images).property.images).toHaveLength(3);
    const submitted = await Promise.all([
      api('post', `${path}/submit`, 'broker'),
      api('post', `${path}/submit`, 'broker'),
    ]);
    expect(submitted.map((result) => result.status).sort()).toEqual([200, 409]);
    const queue = await api('get', '/properties?status=PENDING_APPROVAL&limit=100', 'admin');
    expect(queue.status).toBe(200);
    expect(json(queue).items.some((item) => item._id === String(property._id))).toBe(true);
    const notification = await m.Notification.findOne({
      ...notificationFilter,
      userId: users.admin._id,
    });
    expect(notification.link).toBe('/admin/properties?status=PENDING_APPROVAL');
    expect(
      await m.Notification.countDocuments({ ...notificationFilter, userId: users.admin._id })
    ).toBe(1);
    const alerts = await api('get', '/notifications?limit=100', 'admin');
    expect(json(alerts).items.some((item) => item._id === String(notification._id))).toBe(true);
    expect((await api('post', `${path}/approve`, 'admin')).status).toBe(200);
  });
  test('submission and admin notifications roll back together on a notification failure', async () => {
    const property = await newProperty({ status: 'DRAFT' });
    const create = jest
      .spyOn(m.Notification, 'create')
      .mockRejectedValueOnce(new Error('Notification storage unavailable'));
    try {
      await expect(props.submit(property._id)).rejects.toThrow('Notification storage unavailable');
    } finally {
      create.mockRestore();
    }
    expect((await m.Property.findById(property._id)).status).toBe('DRAFT');
    expect(
      await m.Notification.countDocuments({
        type: 'PROPERTY_SUBMITTED',
        body: `${property.title} has been submitted for review.`,
      })
    ).toBe(0);
  });
  test('saved supporting photos move into the gallery without reupload or duplicate concurrent moves', async () => {
    const property = await newProperty({ status: 'DRAFT' });
    await m.Property.updateOne({ _id: property._id }, { images: [property.images[0]] });
    const path = `/properties/${property._id}`;
    const jpeg = Buffer.from([255, 216, 255, 224, 0, 0]);
    const upload = await api('post', `${path}/media`, 'broker')
      .attach('documents', jpeg, { filename: 'misplaced-one.jpg', contentType: 'image/jpeg' })
      .attach('documents', jpeg, { filename: 'misplaced-two.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);
    const documents = json(upload).property.documents;
    const before = await m.Media.countDocuments({ propertyId: property._id });
    const moved = await Promise.all([
      api('post', `${path}/media/move-to-images`, 'broker').send({
        mediaId: documents[0].publicId,
      }),
      api('post', `${path}/media/move-to-images`, 'broker').send({
        mediaId: documents[0].publicId,
      }),
    ]);
    expect(moved.map((result) => result.status)).toEqual([200, 200]);
    let saved = await m.Property.findById(property._id);
    expect(saved.images).toHaveLength(2);
    expect(saved.documents).toHaveLength(1);
    expect(
      (
        await api('post', `${path}/media/move-to-images`, 'broker').send({
          mediaId: documents[1].publicId,
        })
      ).status
    ).toBe(200);
    saved = await m.Property.findById(property._id);
    expect(saved.images).toHaveLength(3);
    expect(saved.documents).toHaveLength(0);
    expect(saved.images[2].url).toBe(documents[1].url);
    expect(await m.Media.countDocuments({ propertyId: property._id })).toBe(before);
    expect((await api('post', `${path}/submit`, 'broker')).status).toBe(200);
    expect(
      (
        await api('post', `${path}/media/move-to-images`, 'broker').send({
          mediaId: documents[0].publicId,
        })
      ).body.error.code
    ).toBe('IMMUTABLE_FIELD');
  });
  test('moving a document checks file type, property ownership, private media and strict IDs', async () => {
    const property = await newProperty({ status: 'DRAFT' });
    const other = await newProperty({ status: 'DRAFT' });
    const path = `/properties/${property._id}/media/move-to-images`;
    const pdf = await m.Media.create({
      userId: users.broker._id,
      propertyId: property._id,
      private: false,
      mime: 'application/pdf',
      name: 'legal.jpg',
      data: Buffer.from('%PDF-1.4'),
    });
    const foreign = await m.Media.create({
      userId: users.broker._id,
      propertyId: other._id,
      private: false,
      mime: 'image/jpeg',
      name: 'foreign.jpg',
    });
    const privateFile = await m.Media.create({
      userId: users.investor._id,
      private: true,
      mime: 'image/jpeg',
      name: 'kyc.jpg',
    });
    await m.Property.updateOne(
      { _id: property._id },
      {
        documents: [
          { publicId: String(pdf._id), url: `/api/v1/media/${pdf._id}`, name: 'legal.jpg' },
        ],
      }
    );
    for (const file of [pdf, foreign, privateFile])
      expect(
        (await api('post', path, 'broker').send({ mediaId: String(file._id) })).body.error.code
      ).toBe('INVALID_FILE');
    expect((await api('post', path).send({ mediaId: String(pdf._id) })).status).toBe(403);
    await m.Property.updateOne({ _id: property._id }, { brokerId: users.admin._id });
    expect((await api('post', path, 'broker').send({ mediaId: String(pdf._id) })).status).toBe(403);
    expect((await api('post', path, 'admin').send({ mediaId: 'invalid' })).status).toBe(400);
    expect(
      (await api('post', path, 'admin').send({ mediaId: String(pdf._id), url: '/fake' })).status
    ).toBe(400);
    const saved = await m.Property.findById(property._id);
    expect(saved.images).toHaveLength(3);
    expect(saved.documents).toHaveLength(1);
  });
  test('moving a saved photo cannot exceed the 20-image gallery limit', async () => {
    const property = await newProperty({ status: 'REJECTED' });
    const file = await m.Media.create({
      userId: users.broker._id,
      propertyId: property._id,
      private: false,
      mime: 'image/jpeg',
      name: 'photo.jpg',
    });
    await m.Property.updateOne(
      { _id: property._id },
      {
        images: Array.from({ length: 20 }, (_, i) => ({ url: `/assets/photo-${i}.jpg` })),
        documents: [{ publicId: String(file._id), url: `/api/v1/media/${file._id}` }],
      }
    );
    const path = `/properties/${property._id}/media/move-to-images`;
    expect(
      (await api('post', path, 'broker').send({ mediaId: String(file._id) })).body.error.message
    ).toBe('Maximum 20 property images');
    expect((await m.Property.findById(property._id)).documents).toHaveLength(1);
    await m.Property.updateOne({ _id: property._id }, { $pop: { images: 1 } });
    expect((await api('post', path, 'broker').send({ mediaId: String(file._id) })).status).toBe(
      200
    );
    expect((await m.Property.findById(property._id)).images).toHaveLength(20);
  });
  test('property review notifications link to a page the listing owner can access', async () => {
    for (const role of ['admin', 'broker']) {
      for (const status of ['LIVE', 'REJECTED']) {
        const property = await newProperty({ status: 'PENDING_APPROVAL' });
        await m.Property.updateOne({ _id: property._id }, { brokerId: users[role]._id });
        const action = status === 'LIVE' ? 'approve' : 'reject';
        const response = await api('post', `/properties/${property._id}/${action}`, 'admin').send(
          status === 'REJECTED' ? { reason: 'Update listing documents' } : {}
        );
        expect(response.status).toBe(200);
        const notification = await m.Notification.findOne({
          userId: users[role]._id,
          type: status === 'LIVE' ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
          body: { $regex: property.title },
        });
        const expected =
          role === 'admin'
            ? status === 'LIVE'
              ? `/properties/${property._id}`
              : `/admin/properties/${property._id}/edit`
            : `/broker/properties/${property._id}`;
        expect(notification.link).toBe(expected);
        expect((await api('get', `/properties/${property._id}`, role)).status).toBe(200);
      }
    }
  });
  test('reset password token expires and can only be used once', async () => {
    const email = 'new@test.dev';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const response = await request(app).post('/api/v1/auth/forgot-password').send({ email });
    const link = log.mock.calls.flat().find((s) => String(s).includes('[Demo password reset]'));
    log.mockRestore();
    expect(response.status).toBe(200);
    const other = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@test.dev' });
    expect(other.body.message).toBe(response.body.message);
    const token = String(link).split('/reset/')[1];
    expect(token).toBeTruthy();
    await m.User.updateOne({ email }, { resetPasswordExpires: new Date(Date.now() - 1000) });
    expect(
      (
        await request(app)
          .post(`/api/v1/auth/reset-password/${token}`)
          .send({ password: 'Changed@123' })
      ).body.error.code
    ).toBe('INVALID_OR_EXPIRED_TOKEN');
    await m.User.updateOne({ email }, { resetPasswordExpires: new Date(Date.now() + 60000) });
    expect(
      (
        await request(app)
          .post(`/api/v1/auth/reset-password/${token}`)
          .send({ password: 'Changed@123' })
      ).status
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/v1/auth/reset-password/${token}`)
          .send({ password: 'Changed@123' })
      ).body.error.code
    ).toBe('INVALID_OR_EXPIRED_TOKEN');
  });
  test('nested query filters are rejected before reaching database queries', async () => {
    expect((await request(app).get('/api/v1/properties?city[$ne]=Pune')).status).toBe(400);
    expect((await api('get', '/admin/users?role[$ne]=ADMIN', 'admin')).status).toBe(400);
    expect((await api('get', '/admin/properties', 'admin')).status).toBe(200);
  });
});
describe('HTTP investment, payments, KYC, withdrawals and enquiries', () => {
  test('top-up amount is bound to owner and stored order, duplicates rejected, KYC not required', async () => {
    const before = (await m.User.findById(users.investor._id)).walletBalance;
    await m.User.findByIdAndUpdate(users.investor._id, { 'kyc.status': 'PENDING' });
    const order = json(await api('post', '/wallet/topup/order').send({ amount: 10000 }));
    const verify = {
      razorpayOrderId: order.orderId,
      razorpayPaymentId: `mock_${unique()}`,
      razorpaySignature: 'mock',
      amount: 999999,
    };
    expect(
      (await api('post', '/wallet/topup/verify').send({ ...verify, razorpaySignature: 'bad' })).body
        .error.code
    ).toBe('INVALID_PAYMENT_SIGNATURE');
    expect(json(await api('post', '/wallet/topup/verify').send(verify)).walletBalance).toBe(
      before + 10000
    );
    expect((await api('post', '/wallet/topup/verify').send(verify)).body.error.code).toBe(
      'DUPLICATE_TOPUP'
    );
    expect((await api('post', '/wallet/topup/order', 'broker').send({ amount: 1 })).status).toBe(
      403
    );
    await m.User.findByIdAndUpdate(users.investor._id, { 'kyc.status': 'APPROVED' });
  });
  test('investment ignores client amount, enforces KYC/caps, and replay does not debit', async () => {
    const property = await newProperty();
    const data = {
      propertyId: String(property._id),
      units: 10,
      idempotencyKey: unique(),
      amount: 1,
    };
    await m.User.findByIdAndUpdate(users.investor._id, { 'kyc.status': 'PENDING' });
    expect((await api('post', '/investments').send(data)).body.error.code).toBe('KYC_NOT_APPROVED');
    await m.User.findByIdAndUpdate(users.investor._id, { 'kyc.status': 'APPROVED' });
    const first = await api('post', '/investments').send(data);
    expect(first.status).toBe(201);
    expect(json(first).investment.amount).toBe(1000);
    const second = await api('post', '/investments').send(data);
    expect(second.status).toBe(200);
    expect(json(second).investment._id).toBe(json(first).investment._id);
    expect(json(second).walletBalance).toBe(json(first).walletBalance);
    expect(
      (await api('post', '/investments').send({ ...data, units: 490, idempotencyKey: unique() }))
        .body.error.code
    ).toBe('MAX_UNITS_EXCEEDED');
    expect(
      (await api('post', '/investments').send({ ...data, units: 1001, idempotencyKey: unique() }))
        .body.error.code
    ).toBe('INSUFFICIENT_UNITS');
    const portfolio = json(await api('get', '/portfolio/summary'));
    expect(portfolio.allocations.some((a) => a.units === 10 && a.investedAmount === 1000)).toBe(
      true
    );
    const unauthorized = await newInvestor();
    const unauthorizedToken = jwt.sign(
      { userId: String(unauthorized._id) },
      process.env.JWT_SECRET
    );
    expect(
      (
        await request(app)
          .post('/api/v1/investments')
          .set('Authorization', `Bearer ${unauthorizedToken}`)
          .send(data)
      ).body.error.code
    ).toBe('IDEMPOTENCY_KEY_TAKEN');
  });
  test('withdrawal debits only on approval, cannot be processed twice, notifies investor', async () => {
    const bankDetails = {
      accountName: 'Test investor',
      accountNumber: '1234567890',
      ifsc: 'TEST0000001',
    };
    const before = (await m.User.findById(users.investor._id)).walletBalance;
    const pending = await api('post', '/wallet/withdraw').send({ amount: 200, bankDetails });
    expect(pending.status).toBe(201);
    const id = json(pending).withdrawal._id;
    expect((await m.User.findById(users.investor._id)).walletBalance).toBe(before);
    expect(
      (await api('patch', `/admin/withdrawals/${id}`, 'admin').send({ status: 'APPROVED' })).status
    ).toBe(200);
    expect((await m.User.findById(users.investor._id)).walletBalance).toBe(before - 200);
    expect(
      (await api('patch', `/admin/withdrawals/${id}`, 'admin').send({ status: 'APPROVED' })).body
        .error.code
    ).toBe('ALREADY_PROCESSED');
    expect(
      await m.Notification.exists({ userId: users.investor._id, type: 'WITHDRAWAL_APPROVED' })
    ).toBeTruthy();
  });
  test('KYC validates upload and keeps documents private', async () => {
    await m.User.findByIdAndUpdate(users.investor._id, { 'kyc.status': 'NOT_SUBMITTED' });
    expect(
      (
        await api('post', '/kyc').attach('documents', Buffer.from('This is not a PDF'), {
          filename: 'spoofed.pdf',
          contentType: 'application/pdf',
        })
      ).body.error.code
    ).toBe('INVALID_FILE');
    const response = await api('post', '/kyc').attach(
      'documents',
      Buffer.from('%PDF-1.4\nDummy ID\n%%EOF'),
      { filename: 'dummy.pdf', contentType: 'application/pdf' }
    );
    expect(response.status).toBe(200);
    const url = json(response).kyc.docs[0];
    expect((await request(app).get(url)).status).toBe(403);
    expect(
      (await request(app).get(url).set('Authorization', `Bearer ${tokens.admin}`)).status
    ).toBe(200);
    expect(
      (await api('patch', `/admin/kyc/${users.investor._id}`, 'admin').send({ status: 'REJECTED' }))
        .body.error.code
    ).toBe('REJECTION_REASON_REQUIRED');
    expect(
      (await api('patch', `/admin/kyc/${users.investor._id}`, 'admin').send({ status: 'APPROVED' }))
        .status
    ).toBe(200);
    expect(
      (
        await api('post', '/kyc').attach('documents', Buffer.from('%PDF-1.4\nDummy'), {
          filename: 'dummy.pdf',
          contentType: 'application/pdf',
        })
      ).body.error.code
    ).toBe('KYC_ALREADY_APPROVED');
  });
  test('enquiry participants only, own notification and transaction scoping', async () => {
    const p = await newProperty();
    const r = await api('post', '/enquiries').send({
      propertyId: String(p._id),
      message: 'When does the holding period begin?',
    });
    expect(r.status).toBe(201);
    const id = json(r).enquiry._id;
    expect(
      (
        await api('post', `/enquiries/${id}/reply`, 'broker').send({
          text: 'After acquisition is confirmed.',
        })
      ).status
    ).toBe(200);
    const outsider = await newInvestor();
    const token = jwt.sign({ userId: String(outsider._id) }, process.env.JWT_SECRET);
    expect(
      (
        await request(app)
          .post(`/api/v1/enquiries/${id}/reply`)
          .set('Authorization', `Bearer ${token}`)
          .send({ text: 'Unauthorized' })
      ).status
    ).toBe(403);
    const notification = await m.Notification.findOne({ userId: users.investor._id });
    expect(
      (
        await request(app)
          .patch(`/api/v1/notifications/${notification._id}/read`)
          .set('Authorization', `Bearer ${token}`)
      ).status
    ).toBe(403);
    expect((await api('patch', `/notifications/${notification._id}/read`)).status).toBe(200);
    const tx = json(await api('get', `/transactions?userId=${users.broker._id}`));
    expect(tx.items.every((t) => String(t.userId) === String(users.investor._id))).toBe(true);
  });
});
describe('Admin-owned listing enquiries', () => {
  test('an admin owner can answer their enquiries but cannot access unrelated broker threads', async () => {
    const owned = await newProperty();
    await m.Property.updateOne({ _id: owned._id }, { brokerId: users.admin._id });
    const other = await newProperty();
    const create = async (property) =>
      json(
        await api('post', '/enquiries').send({
          propertyId: String(property._id),
          message: 'Can the listing owner explain the holding period?',
        })
      ).enquiry;
    const ownThread = await create(owned);
    const otherThread = await create(other);
    const ownList = await api('get', `/enquiries?propertyId=${owned._id}`, 'admin');
    expect(ownList.status).toBe(200);
    expect(json(ownList).items.map((thread) => thread._id)).toEqual([ownThread._id]);
    expect(json(await api('get', `/enquiries?propertyId=${other._id}`, 'admin')).total).toBe(0);
    expect(
      (await api('post', `/enquiries/${ownThread._id}/reply`, 'admin').send({ text: '24 months.' }))
        .status
    ).toBe(200);
    expect(
      (
        await api('post', `/enquiries/${otherThread._id}/reply`, 'admin').send({
          text: 'Unrelated',
        })
      ).status
    ).toBe(403);
    expect(
      (await api('post', `/enquiries/${ownThread._id}/reply`, 'broker').send({ text: 'Unrelated' }))
        .status
    ).toBe(403);
  });
});
describe('Concurrent HTTP transactions across independent accounts', () => {
  const asUser = (user, method, path) => {
    const req = request(app)[method](`/api/v1${path}`);
    return req.set(
      'Authorization',
      `Bearer ${jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET)}`
    );
  };
  test('eight users buy concurrently without mixing wallet, portfolio or ledger data', async () => {
    const property = await newProperty({ units: 400, price: 101 });
    const buyers = [];
    for (let i = 0; i < 8; i++) buyers.push(await newInvestor(10000));
    const results = await Promise.all(
      buyers.map((user) =>
        asUser(user, 'post', '/investments').send({
          propertyId: String(property._id),
          units: 40,
          idempotencyKey: unique(),
        })
      )
    );
    expect(results.every((result) => result.status === 201)).toBe(true);
    expect((await m.Property.findById(property._id)).unitsSold).toBe(320);
    for (let i = 0; i < buyers.length; i++) {
      const user = buyers[i];
      expect(String(json(results[i]).investment.investorId)).toBe(String(user._id));
      expect((await m.User.findById(user._id)).walletBalance).toBe(5960);
      expect(await ledger.getBalance(user._id)).toBe(5960);
      const ownResponse = await asUser(user, 'get', '/investments/me');
      expect(ownResponse.status).toBe(200);
      const own = json(ownResponse);
      expect(own.items).toHaveLength(1);
      expect(String(own.items[0].investorId)).toBe(String(user._id));
      const entries = json(await asUser(user, 'get', '/transactions'));
      expect(entries.items.every((entry) => String(entry.userId) === String(user._id))).toBe(true);
    }
  });
  test('concurrent payment confirmations credit each user once per order', async () => {
    const holders = [];
    const confirmations = [];
    for (let i = 0; i < 4; i++) {
      const user = await newInvestor(0);
      holders.push(user);
      for (const amount of [200, 300]) {
        const order = json(await asUser(user, 'post', '/wallet/topup/order').send({ amount }));
        const body = {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `mock_${unique()}`,
          razorpaySignature: 'mock',
        };
        confirmations.push(
          asUser(user, 'post', '/wallet/topup/verify').send(body),
          asUser(user, 'post', '/wallet/topup/verify').send(body)
        );
      }
    }
    const results = await Promise.all(confirmations);
    expect(results.filter((result) => result.status === 200)).toHaveLength(8);
    expect(results.filter((result) => result.body.error?.code === 'DUPLICATE_TOPUP')).toHaveLength(
      8
    );
    for (const user of holders) {
      expect((await m.User.findById(user._id)).walletBalance).toBe(500);
      expect(await ledger.getBalance(user._id)).toBe(500);
      expect(await m.Transaction.countDocuments({ userId: user._id, type: 'TOPUP' })).toBe(2);
    }
  });
  test('simultaneous purchases of different properties cannot overspend one wallet', async () => {
    const user = await newInvestor(1000);
    const a = await newProperty(),
      b = await newProperty();
    const results = await Promise.all(
      [a, b].map((property) =>
        asUser(user, 'post', '/investments').send({
          propertyId: String(property._id),
          units: 7,
          idempotencyKey: unique(),
        })
      )
    );
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.find((result) => result.status !== 201).body.error.code).toBe(
      'INSUFFICIENT_BALANCE'
    );
    expect((await m.User.findById(user._id)).walletBalance).toBe(300);
    expect(await ledger.getBalance(user._id)).toBe(300);
    expect(await m.Investment.countDocuments({ investorId: user._id })).toBe(1);
    const properties = await m.Property.find({ _id: { $in: [a._id, b._id] } });
    expect(properties.reduce((sum, property) => sum + property.unitsSold, 0)).toBe(7);
  });
});
describe('Financial properties against a real MongoDB replica set (100 runs each)', () => {
  test('CP1: wallet counter equals ledger after every operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 8 }),
        async (amounts) => {
          const user = await newInvestor(0);
          let balance = 0;
          for (const value of amounts) {
            const amount = Math.abs(value) + 1;
            if (value < 0 && balance >= amount) {
              await ledger.post({
                userId: user._id,
                type: 'WITHDRAWAL',
                direction: 'DEBIT',
                amount,
              });
              balance -= amount;
            } else {
              await ledger.post({ userId: user._id, type: 'TOPUP', direction: 'CREDIT', amount });
              balance += amount;
            }
            expect((await m.User.findById(user._id)).walletBalance).toBe(balance);
            expect(await ledger.getBalance(user._id)).toBe(balance);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);
  test('CP7: debit is conditional and insufficient funds never change balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 1, max: 20000 }),
        async (balance, debit) => {
          const user = await newInvestor(balance);
          if (debit > balance)
            await expect(
              ledger.post({
                userId: user._id,
                type: 'WITHDRAWAL',
                direction: 'DEBIT',
                amount: debit,
              })
            ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
          else
            await ledger.post({
              userId: user._id,
              type: 'WITHDRAWAL',
              direction: 'DEBIT',
              amount: debit,
            });
          expect((await m.User.findById(user._id)).walletBalance).toBe(
            debit > balance ? balance : balance - debit
          );
        }
      ),
      { numRuns: 100 }
    );
  });
  test('CP2: simultaneous requests for last units cannot oversell', async () => {
    await m.Settings.findByIdAndUpdate('platform', { maxOwnershipPct: 100 });
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 10, max: 100 }), async (units) => {
        const property = await newProperty({ units });
        const a = await newInvestor(),
          b = await newInvestor();
        const results = await Promise.allSettled(
          [a, b].map((u) =>
            investment.invest(u._id, {
              propertyId: String(property._id),
              units,
              idempotencyKey: unique(),
            })
          )
        );
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.find((r) => r.status === 'rejected').reason.code).toBe('INSUFFICIENT_UNITS');
        const active = await m.Investment.find({ propertyId: property._id, status: 'ACTIVE' });
        expect(active.reduce((s, i) => s + i.units, 0)).toBe(units);
        expect(
          await m.Transaction.countDocuments({
            refType: 'Property',
            refId: property._id,
            type: 'COMMISSION',
          })
        ).toBe(1);
      }),
      { numRuns: 100 }
    );
  }, 180000);
  test('CP4: sequential and concurrent idempotency produce one investment and one debit', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (units) => {
        const user = await newInvestor();
        const property = await newProperty();
        const data = { propertyId: String(property._id), units, idempotencyKey: unique() };
        const [first, second] = await Promise.all([
          investment.invest(user._id, data),
          investment.invest(user._id, data),
        ]);
        expect(String(first.investment._id)).toBe(String(second.investment._id));
        const balance = (await m.User.findById(user._id)).walletBalance;
        expect((await investment.invest(user._id, data)).walletBalance).toBe(balance);
        expect(await m.Investment.countDocuments({ idempotencyKey: data.idempotencyKey })).toBe(1);
        expect(
          await m.Transaction.countDocuments({ type: 'INVESTMENT', refId: first.investment._id })
        ).toBe(1);
      }),
      { numRuns: 100 }
    );
  }, 180000);
  test('simultaneous repeat purchases cannot exceed an investor ownership cap', async () => {
    const user = await newInvestor();
    const property = await newProperty({ units: 100, cap: 30 });
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        investment.invest(user._id, {
          propertyId: String(property._id),
          units: 20,
          idempotencyKey: unique(),
        })
      )
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason.code).toBe('MAX_UNITS_EXCEEDED');
    expect((await m.Property.findById(property._id)).unitsSold).toBe(20);
    expect((await m.User.findById(user._id)).walletBalance).toBe(1000000 - 2000);
  });
  test('CP6: cancellation refunds every lot completely with no fee', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 4 }),
        async (unitList) => {
          const property = await newProperty();
          const holders = [];
          for (const units of unitList) {
            const user = await newInvestor();
            holders.push(user);
            await investment.invest(user._id, {
              propertyId: String(property._id),
              units,
              idempotencyKey: unique(),
            });
          }
          await props.changeStatus(property._id, 'CANCELLED');
          for (const holder of holders)
            expect((await m.User.findById(holder._id)).walletBalance).toBe(1000000);
          const lots = await m.Investment.find({ propertyId: property._id });
          for (const lot of lots) {
            expect(lot.status).toBe('REFUNDED');
            const refund = await m.Transaction.findOne({ refId: lot._id, type: 'REFUND' });
            expect(refund.amount).toBe(lot.amount);
          }
          expect((await m.Property.findById(property._id)).unitsSold).toBe(0);
          await expect(props.changeStatus(property._id, 'CANCELLED')).rejects.toMatchObject({
            code: 'ALREADY_CANCELLED',
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);
});
describe('Payout lifecycle and transaction rollback', () => {
  test('refund failure preserves all investment lots, wallets and property state', async () => {
    const p = await newProperty();
    const a = await newInvestor(),
      b = await newInvestor();
    for (const user of [a, b])
      await investment.invest(user._id, {
        propertyId: String(p._id),
        units: 10,
        idempotencyKey: unique(),
      });
    // Simulate a wallet already at its representable bound to force a later credit to fail.
    await m.User.findByIdAndUpdate(b._id, { walletBalance: Number.MAX_SAFE_INTEGER });
    await expect(props.changeStatus(p._id, 'CANCELLED')).rejects.toMatchObject({
      code: 'BALANCE_LIMIT',
    });
    expect((await m.Property.findById(p._id)).status).toBe('LIVE');
    expect((await m.Property.findById(p._id)).unitsSold).toBe(20);
    expect((await m.User.findById(a._id)).walletBalance).toBe(999000);
    expect(await m.Investment.countDocuments({ propertyId: p._id, status: 'ACTIVE' })).toBe(2);
    expect(
      await m.Transaction.countDocuments({ type: 'REFUND', userId: { $in: [a._id, b._id] } })
    ).toBe(0);
    await m.User.findByIdAndUpdate(b._id, { walletBalance: await ledger.getBalance(b._id) });
  });
  test('sale preview writes nothing; sale exits all lots, pays exact sums and rejects repeat', async () => {
    const p = await newProperty({ units: 10, price: 101 });
    const a = await newInvestor(),
      b = await newInvestor();
    await investment.invest(a._id, {
      propertyId: String(p._id),
      units: 3,
      idempotencyKey: unique(),
    });
    await investment.invest(a._id, {
      propertyId: String(p._id),
      units: 2,
      idempotencyKey: unique(),
    });
    await investment.invest(b._id, {
      propertyId: String(p._id),
      units: 5,
      idempotencyKey: unique(),
    });
    await props.changeStatus(p._id, 'HOLDING');
    const before = await m.Transaction.countDocuments();
    const preview = await payout.previewPayout(p._id, 1507);
    expect(preview.check).toBe(true);
    expect(await m.Transaction.countDocuments()).toBe(before);
    const sold = await payout.executePayout(p._id, 1507, users.admin._id);
    expect(sold.items.reduce((s, i) => s + i.payoutAmount, 0)).toBe(sold.distributable);
    const lots = await m.Investment.find({ propertyId: p._id });
    expect(lots.every((i) => i.status === 'EXITED')).toBe(true);
    expect(lots.reduce((s, i) => s + i.payoutAmount, 0)).toBe(sold.distributable);
    await expect(payout.executePayout(p._id, 1507, users.admin._id)).rejects.toMatchObject({
      code: 'ALREADY_SOLD',
    });
    for (const user of [a, b, users.admin, users.broker])
      expect((await m.User.findById(user._id)).walletBalance).toBe(
        await ledger.getBalance(user._id)
      );
  });
  test('ledger insert failure rolls back wallet change', async () => {
    const user = await newInvestor(10000);
    const entryCount = await m.Transaction.countDocuments({ userId: user._id });
    await expect(
      ledger.transact(async (session) => {
        await ledger.post({
          userId: user._id,
          type: 'TOPUP',
          direction: 'CREDIT',
          amount: 500,
          session,
        });
        throw new Error('Forced transaction failure');
      })
    ).rejects.toThrow('Forced transaction failure');
    expect((await m.User.findById(user._id)).walletBalance).toBe(10000);
    expect(await m.Transaction.countDocuments({ userId: user._id })).toBe(entryCount);
    await expect(
      ledger.post({
        userId: user._id,
        type: 'TOPUP',
        direction: 'CREDIT',
        amount: 1,
        gatewayPaymentId: 'duplicate_test',
      })
    ).resolves.toBeTruthy();
    await expect(
      ledger.post({
        userId: user._id,
        type: 'TOPUP',
        direction: 'CREDIT',
        amount: 50,
        gatewayPaymentId: 'duplicate_test',
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_TOPUP' });
    expect((await m.User.findById(user._id)).walletBalance).toBe(10001);
  });
  test('seed reset is repeatable and wallets reconcile', async () => {
    const { seedData } = await import('../scripts/seed-data.js');
    await seedData({ reset: true });
    await seedData({ reset: true });
    expect(await m.Property.countDocuments()).toBe(8);
    expect(await m.User.countDocuments({ role: 'INVESTOR' })).toBe(7);
    const statuses = (await m.Property.find().lean()).map((p) => p.status).sort();
    expect(statuses).toEqual(
      ['DRAFT', 'FUNDED', 'HOLDING', 'LIVE', 'LIVE', 'PENDING_APPROVAL', 'REJECTED', 'SOLD'].sort()
    );
  }, 180000);
});
