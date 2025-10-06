// scripts/hash-operators-passwords.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;
  const collectionName = process.env.OPERATOR_COLLECTION || 'operators';

  if (!uri) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  if (!dbName) {
    console.error('Missing DB_NAME in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);

    // Find docs that have a password (not null) AND do NOT already have passwordHash
    const cursor = col.find({
      password: { $exists: true, $ne: null },
      passwordHash: { $exists: false }
    });

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      // defensive: skip if no password
      if (!doc.password) continue;
      const hash = await bcrypt.hash(doc.password, 12);
      await col.updateOne(
        { _id: doc._id },
        { $set: { passwordHash: hash }, $unset: { password: "" } }
      );
      console.log('Hashed and updated', doc._id.toString());
    }

    console.log('Migration complete');
  } catch (e) {
    console.error('Migration error', e);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
