/*
  Test MongoDB connection script.
  - If MONGODB_URI is set in the environment, it will attempt to connect to that.
  - Otherwise, it will start an in-memory mongodb instance (mongodb-memory-server) and connect to it.

  Usage:
    node backend/scripts/test-mongo-connection.js
    MONGODB_URI="mongodb+srv://..." node backend/scripts/test-mongo-connection.js
*/

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  let mongod;
  const uri = process.env.MONGODB_URI;
  try {
    const connectUri = uri || (await (async () => {
      mongod = await MongoMemoryServer.create();
      return mongod.getUri();
    })());

    console.log('[mongo-test] Connecting to', connectUri.replace(/\/.*$/, '/<redacted>'));
    await mongoose.connect(connectUri, { dbName: 'codeeditor_test', autoIndex: false });
    console.log('[mongo-test] Connected');

    const Test = mongoose.model('TestHealth', new mongoose.Schema({ ok: Boolean }), 'healthcheck');
    const doc = await Test.create({ ok: true });
    console.log('[mongo-test] Inserted doc id=', doc._id.toString());
    await Test.deleteOne({ _id: doc._id });
    console.log('[mongo-test] Deleted test doc');

    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    console.log('[mongo-test] Success — connection verified');
    process.exit(0);
  } catch (err) {
    console.error('[mongo-test] Error:', err && err.stack ? err.stack : err);
    try { await mongoose.disconnect(); } catch (e) {}
    if (mongod) try { await mongod.stop(); } catch (e) {}
    process.exit(2);
  }
})();
