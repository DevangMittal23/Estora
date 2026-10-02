import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User, Property, Payout, Investment, Settings, models } from '../src/models/index.js';
import { env } from '../src/config/env.js';
import * as ledger from '../src/services/ledger.service.js';
import * as properties from '../src/services/property.service.js';
import * as investments from '../src/services/investment.service.js';
import * as payouts from '../src/services/payout.service.js';
import * as media from '../src/services/media.service.js';
import { dummyPdf } from './dummy-pdf.js';
export async function seedData({ reset = false } = {}) {
  const existing = await User.countDocuments();
  if (existing) {
    if (!reset)
      throw new Error(
        'Database is not empty. Set ALLOW_SEED_RESET=true only if you intend to replace it with demo data.'
      );
    // Seed reset is the sole explicit administrative exception to append-only history.
    for (const model of models) await model.collection.deleteMany({});
  }
  await Settings.findOneAndUpdate(
    { _id: 'platform' },
    {
      $set: {
        platformFeePct: env.PLATFORM_FEE_PCT,
        brokerCommissionPct: env.BROKER_COMMISSION_PCT,
        maxOwnershipPct: env.MAX_OWNERSHIP_PCT,
      },
    },
    { upsert: true, new: true }
  );
  const hashes = await Promise.all(
    ['Admin@123', 'Broker@123', 'Investor@123'].map((p) => bcrypt.hash(p, env.BCRYPT_ROUNDS))
  );
  const admin = await User.create({
    name: 'Devika Sharma',
    email: 'admin@estora.dev',
    phone: '9876500000',
    role: 'ADMIN',
    passwordHash: hashes[0],
  });
  const broker = await User.create({
    name: 'Rohit Mehra',
    email: 'broker1@estora.dev',
    phone: '9876500001',
    role: 'BROKER',
    brokerApproved: true,
    passwordHash: hashes[1],
  });
  await User.create({
    name: 'Neha Kapoor',
    email: 'broker2@estora.dev',
    phone: '9876500002',
    role: 'BROKER',
    passwordHash: hashes[1],
  });
  const investorUsers = [];
  const names = [
    'Aman Mittal',
    'Priya Singh',
    'Karan Shah',
    'Ananya Rao',
    'Arjun Patel',
    'Isha Verma',
    'Kabir Sen',
  ];
  for (let i = 0; i < names.length; i++) {
    const status = i < 4 ? 'APPROVED' : ['PENDING', 'REJECTED', 'NOT_SUBMITTED'][i - 4];
    const user = await User.create({
      name: names[i],
      email: `investor${i + 1}@estora.dev`,
      phone: `987650001${i}`,
      role: 'INVESTOR',
      passwordHash: hashes[2],
      kyc: {
        status,
        reason: status === 'REJECTED' ? 'Please upload a clearer dummy document.' : '',
      },
    });
    if (status === 'PENDING') {
      const files = await media.saveFiles(
        [
          {
            buffer: dummyPdf('Dummy academic identity document'),
            mimetype: 'application/pdf',
            originalname: 'dummy-identity.pdf',
          },
        ],
        user._id
      );
      user.kyc.docs = files.map((f) => f.url);
      await user.save();
    }
    await ledger.post({
      userId: user._id,
      type: 'TOPUP',
      direction: 'CREDIT',
      amount: 5000000000,
      gatewayPaymentId: `seed_topup_${i}`,
    });
    investorUsers.push(user);
  }
  const titles = [
    'The Palm Residences',
    'Harbour One Offices',
    'Aranya Garden Villas',
    'Skyline Business Park',
    'The Courtyard Collection',
    'Greenfield Logistics Hub',
    'Lakefront Terraces',
    'The Urban Acre',
  ];
  const cities = [
    'Bengaluru',
    'Mumbai',
    'Pune',
    'Hyderabad',
    'Noida',
    'Chennai',
    'Bengaluru',
    'Gurugram',
  ];
  const states = [
    'Karnataka',
    'Maharashtra',
    'Maharashtra',
    'Telangana',
    'Uttar Pradesh',
    'Tamil Nadu',
    'Karnataka',
    'Haryana',
  ];
  const pincodes = ['560001', '400001', '411001', '500001', '201301', '600001', '560001', '122001'];
  const types = [
    'APARTMENT',
    'COMMERCIAL',
    'VILLA',
    'COMMERCIAL',
    'APARTMENT',
    'WAREHOUSE',
    'APARTMENT',
    'PLOT',
  ];
  const geos = [
    { lat: 12.97, lng: 77.59 },
    { lat: 19.07, lng: 72.87 },
    { lat: 18.52, lng: 73.85 },
    { lat: 17.38, lng: 78.48 },
    { lat: 28.53, lng: 77.39 },
    { lat: 13.08, lng: 80.27 },
    { lat: 12.97, lng: 77.59 },
    { lat: 28.46, lng: 77.02 },
  ];
  for (let i = 0; i < titles.length; i++) {
    const property = await properties.create(
      {
        title: titles[i],
        description: `A curated ${types[i].toLowerCase()} opportunity in ${cities[i]}. Professionally sourced, with transparent unit pricing and a planned 24-month holding period. All imagery and financial figures are illustrative academic demo data.`,
        type: types[i],
        address: `${12 + i} Residency Road`,
        city: cities[i],
        state: states[i],
        pincode: pincodes[i],
        areaSqft: 2400 + i * 600,
        geo: geos[i],
        valuation: 1000000000 + i * 100000000,
        totalUnits: 1000,
        minUnits: 1,
        maxUnitsPerInvestor: 490,
        expectedAppreciationPct: 10 + i,
        rentalYieldPct: 3.5 + i * 0.25,
        holdingPeriodMonths: 24,
        images: [0, 1, 2].map((n) => ({
          url: `/assets/property-${((i + n) % 3) + 1}.svg`,
          name: `${titles[i]} — view ${n + 1}`,
        })),
      },
      broker
    );
    await media.addPropertyMedia(property._id, broker, {
      documents: [
        {
          buffer: dummyPdf(`${titles[i]} - illustrative valuation`),
          mimetype: 'application/pdf',
          originalname: 'illustrative-valuation.pdf',
        },
      ],
    });
    if (i === 7) continue;
    await properties.submit(property._id);
    if (i === 6) {
      await properties.review(
        property._id,
        admin._id,
        'REJECTED',
        'Please provide an updated valuation document before approval.'
      );
      continue;
    }
    if (i === 5) continue;
    await properties.review(property._id, admin._id, 'LIVE');
    const units = i === 0 ? [200, 200] : i === 1 ? [250, 250, 250] : [250, 250, 250, 250];
    for (let j = 0; j < units.length; j++)
      await investments.invest(investorUsers[j]._id, {
        propertyId: String(property._id),
        units: units[j],
        idempotencyKey: `seed_property_${i}_investor_${j}`,
      });
    if (i === 3 || i === 4) await properties.changeStatus(property._id, 'HOLDING');
    if (i === 4) await payouts.executePayout(property._id, 1960000000, admin._id);
  }
  const allUsers = await User.find();
  for (const user of allUsers)
    assert.equal(
      user.walletBalance,
      await ledger.getBalance(user._id),
      `Ledger reconciliation failed for ${user.email}`
    );
  assert.equal(await Property.countDocuments(), 8);
  const sold = await Property.findOne({ status: 'SOLD' });
  assert.ok(await Payout.exists({ propertyId: sold._id }));
  assert.equal(await Investment.countDocuments({ propertyId: sold._id, status: 'ACTIVE' }), 0);
  console.log(`Seed complete: ${allUsers.length} users, 8 properties. All wallets reconciled.`);
  return { admin, broker, investors: investorUsers };
}
export const disconnect = () => mongoose.disconnect();
