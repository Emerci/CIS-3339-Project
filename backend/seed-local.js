require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { orgs, users } = require('./models/models');

async function main() {
  const orgId = process.env.ORG_ID;
  if (!process.env.MONGO_URL || !orgId) throw new Error('Set MONGO_URL and ORG_ID in .env first');
  await mongoose.connect(process.env.MONGO_URL);

  await orgs.updateOne(
    { _id: orgId },
    { $setOnInsert: { _id: orgId, name: 'Community Center' } },
    { upsert: true }
  );

  for (const [username, password, role] of [
    ['user', 'user', 'viewer'],
    ['admin', 'admin', 'editor']
  ]) {
    const hash = await bcrypt.hash(password, 10);
    await users.updateOne(
      { username, org: orgId },
      { $set: { password: hash, role }, $setOnInsert: { _id: new mongoose.Types.ObjectId() } },
      { upsert: true }
    );
    console.log('ready:', username, `(${role})`);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
