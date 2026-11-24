// D1: initialize the database with everything needed to use and grade the app.
//
//   cd backend
//   npm run db:init
//
// What it does (all idempotent: running it again never creates duplicates and never deletes data):
//   - checks the configuration first and exits with code 1 if something is wrong
//   - creates the organization whose _id is ORG_ID
//   - creates the viewer and editor accounts (passwords are hashed with bcrypt before they are stored)
//   - creates sample clients, services and events, including event registrations
//   - creates a second, separate organization with its own records, to demonstrate organization isolation
//   - creates the indexes the app relies on
//
// Settings come from backend/.env:
//   MONGO_URL, ORG_ID                                   required
//   SEED_VIEWER_USERNAME / SEED_VIEWER_PASSWORD         default: user / user
//   SEED_EDITOR_USERNAME / SEED_EDITOR_PASSWORD         default: admin / admin
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { orgs, users, clients, events, services } = require('../models/models');

mongoose.set('strictQuery', false); // same setting as app.js (silences a Mongoose 6 warning)

const fail = (msg) => {
  console.error(`\ndb:init failed: ${msg}\n`);
  process.exit(1);
};

// ---------- 1. check the configuration ----------
function readConfig() {
  const problems = [];
  const mongoUrl = (process.env.MONGO_URL || '').trim();
  const orgId = (process.env.ORG_ID || '').trim();

  if (!mongoUrl) problems.push('MONGO_URL is missing or empty in backend/.env');
  else if (!/^mongodb(\+srv)?:\/\//.test(mongoUrl)) problems.push('MONGO_URL must start with mongodb:// or mongodb+srv://');

  if (!orgId) problems.push('ORG_ID is missing or empty in backend/.env');
  else if (!/^[0-9a-fA-F]{24}$/.test(orgId)) problems.push('ORG_ID must be exactly 24 hexadecimal characters');

  const seed = (name, fallback) => (process.env[name] || '').trim() || fallback;
  const accounts = [
    { username: seed('SEED_VIEWER_USERNAME', 'user'), password: seed('SEED_VIEWER_PASSWORD', 'user'), role: 'viewer' },
    { username: seed('SEED_EDITOR_USERNAME', 'admin'), password: seed('SEED_EDITOR_PASSWORD', 'admin'), role: 'editor' }
  ];
  if (accounts[0].username === accounts[1].username) problems.push('The viewer and editor usernames must be different');

  if (problems.length) fail('configuration problems:\n  - ' + problems.join('\n  - '));
  return { mongoUrl, orgId, accounts };
}

// Stable 24-character ids derived from ORG_ID, so running the script again finds the same records
// instead of creating new ones (and two different ORG_IDs never collide).
const stableId = (orgId, key) =>
  new mongoose.Types.ObjectId(crypto.createHash('sha1').update(`${orgId}:${key}`).digest('hex').slice(0, 24));

const daysFromNow = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

const tally = { created: {}, existing: {} };
const count = (kind, name, wasCreated) => {
  const bucket = wasCreated ? tally.created : tally.existing;
  bucket[kind] = (bucket[kind] || 0) + 1;
  console.log(`  ${wasCreated ? 'created ' : 'exists  '} ${kind}: ${name}`);
};

// insert only when the _id is not there yet; never overwrites or removes existing data
async function insertIfMissing(Model, kind, name, doc) {
  const res = await Model.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  count(kind, name, res.upsertedCount > 0);
}

async function main() {
  const { mongoUrl, orgId, accounts } = readConfig();
  const host = (mongoUrl.match(/@([^/?]+)/) || mongoUrl.match(/\/\/([^/?]+)/) || [])[1] || 'database';

  console.log(`\nConnecting to ${host} ...`);
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    fail(
      `could not connect to MongoDB (${err.message}).\n` +
        '  Check MONGO_URL (username/password, database name) and that your IP is allowed in Atlas Network Access.'
    );
  }
  console.log(`Connected to database "${mongoose.connection.name}".\n`);

  const O = new mongoose.Types.ObjectId(orgId);
  const O2 = stableId(orgId, 'second-org');

  // ---------- 2. organizations ----------
  console.log('Organizations');
  await insertIfMissing(orgs, 'organization', 'Community Center (ORG_ID)', { _id: O, name: 'Community Center' });
  await insertIfMissing(orgs, 'organization', 'Riverside Outreach (second org, for the isolation demo)', {
    _id: O2,
    name: 'Riverside Outreach'
  });

  // ---------- 3. accounts ----------
  console.log('\nAccounts');
  for (const a of accounts) {
    const existing = await users.findOne({ username: a.username, org: O });
    if (existing) {
      const same = await bcrypt.compare(a.password, existing.password).catch(() => false);
      count('account', `${a.username} (${a.role})${same ? '' : ' - exists with a different password; left unchanged'}`, false);
      continue;
    }
    const hash = await bcrypt.hash(a.password, 10); // never store a plaintext password
    await users.create({ _id: stableId(orgId, `user:${a.username}`), username: a.username, password: hash, role: a.role, org: O });
    count('account', `${a.username} (${a.role})`, true);
  }

  // ---------- 4. services ----------
  console.log('\nServices');
  const svc = (key, name, description, status, org = O) => ({ _id: stableId(orgId, `service:${key}`), name, description, status, org });
  const services_ = [
    svc('food', 'Food Pantry', 'Weekly groceries and fresh produce for local families.', 'Active'),
    svc('health', 'Health Screening', 'Free blood pressure, glucose and vision checks.', 'Active'),
    svc('tax', 'Tax Preparation Help', 'Volunteer-assisted filing for low-income households.', 'Inactive'),
    svc('other-food', 'Meal Delivery', 'Home-delivered meals (other organization).', 'Active', O2)
  ];
  for (const s of services_) await insertIfMissing(services, 'service', s.name, s);

  // ---------- 5. clients ----------
  console.log('\nClients');
  const cl = (key, firstName, lastName, phone, email, city, zip, org = O) => ({
    _id: stableId(orgId, `client:${key}`),
    firstName,
    lastName,
    email,
    phoneNumber: { primary: phone },
    address: { line1: `${100 + key.length * 7} Main St`, city, county: 'Harris', zip },
    orgs: [org]
  });
  const clients_ = [
    cl('maria', 'Maria', 'Gonzalez', '713-555-0101', 'maria.gonzalez@example.com', 'Houston', '77002'),
    cl('james', 'James', 'Carter', '713-555-0102', 'james.carter@example.com', 'Houston', '77002'),
    cl('linh', 'Linh', 'Nguyen', '281-555-0103', 'linh.nguyen@example.com', 'Sugar Land', '77479'),
    cl('david', 'David', 'Okafor', '281-555-0104', 'david.okafor@example.com', 'Katy', '77449'),
    cl('sofia', 'Sofia', 'Ramirez', '832-555-0105', 'sofia.ramirez@example.com', 'Houston', '77004'),
    cl('aisha', 'Aisha', 'Khan', '832-555-0106', 'aisha.khan@example.com', 'Pearland', '77584'),
    cl('other-1', 'Olivia', 'Brooks', '214-555-0199', 'olivia.brooks@example.com', 'Dallas', '75201', O2)
  ];
  for (const c of clients_) await insertIfMissing(clients, 'client', `${c.firstName} ${c.lastName}`, c);

  // ---------- 6. events (with registrations) ----------
  console.log('\nEvents');
  const id = (k) => stableId(orgId, `client:${k}`);
  const sid = (k) => stableId(orgId, `service:${k}`);
  const ev = (key, name, offsetDays, description, serviceKeys, attendeeKeys, city, zip, org = O) => ({
    _id: stableId(orgId, `event:${key}`),
    org,
    name,
    date: daysFromNow(offsetDays),
    description,
    address: { line1: '500 Community Way', city, county: 'Harris', zip },
    services: serviceKeys.map(sid),
    attendees: attendeeKeys.map(id)
  });
  const events_ = [
    ev('pantry', 'Neighborhood Food Pantry', -40, 'Monthly pantry distribution.', ['food'], ['maria', 'james', 'linh', 'david'], 'Houston', '77002'),
    ev('screening', 'Community Health Fair', -18, 'Screenings and wellness information.', ['health'], ['maria', 'sofia', 'aisha'], 'Sugar Land', '77479'),
    ev('pantry2', 'Neighborhood Food Pantry', -5, 'Monthly pantry distribution.', ['food'], ['james', 'sofia'], 'Houston', '77002'),
    ev('taxday', 'Tax Help Saturday', 14, 'Bring last year\'s return and ID.', ['tax'], ['linh'], 'Katy', '77449'),
    ev('other-fair', 'Riverside Resource Fair', -10, 'Other organization event.', ['other-food'], ['other-1'], 'Dallas', '75201', O2)
  ];
  // the other organization's event must reference its own service and client
  events_[4].services = [sid('other-food')];
  events_[4].attendees = [id('other-1')];
  for (const e of events_) await insertIfMissing(events, 'event', `${e.name} (${e.attendees.length} registered)`, e);

  // ---------- 7. indexes ----------
  console.log('\nIndexes');
  const indexes = [
    [users, 'users (org, username) unique', { org: 1, username: 1 }, { unique: true }],
    [clients, 'clients (orgs)', { orgs: 1 }, {}],
    [events, 'events (org, date)', { org: 1, date: -1 }, {}],
    [events, 'events (attendees)', { attendees: 1 }, {}],
    [services, 'services (org)', { org: 1 }, {}]
  ];
  for (const [Model, label, keys, opts] of indexes) {
    try {
      await Model.collection.createIndex(keys, opts);
      console.log(`  ready    ${label}`);
    } catch (err) {
      console.log(`  skipped  ${label}: ${err.message}`); // e.g. duplicate users already in the collection
    }
  }

  // ---------- 8. summary ----------
  const sum = (o) => Object.entries(o).map(([k, v]) => `${v} ${k}${v === 1 ? '' : 's'}`).join(', ') || 'nothing';
  console.log('\n----------------------------------------');
  console.log(`Newly created: ${sum(tally.created)}`);
  console.log(`Already there: ${sum(tally.existing)}`);
  console.log(`Organization ID (ORG_ID): ${orgId}`);
  console.log('Log in with:');
  for (const a of accounts) console.log(`  ${a.role.padEnd(6)} ${a.username} / ${a.password}`);
  console.log('Run it again any time: it never creates duplicates and never deletes data.');
  console.log('----------------------------------------\n');
  await mongoose.disconnect();
}

main().catch((err) => fail(err.message));