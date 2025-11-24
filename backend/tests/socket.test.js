const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const ioClient = require('socket.io-client');

let mongod;
let appModule;
let app;
let serverInstance;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  appModule = require('../server');
  app = appModule.app;
  serverInstance = appModule.server;
  // start listening on ephemeral port for socket.io tests
  await new Promise((resolve) => serverInstance.listen(0, resolve));
});

afterAll(async () => {
  try {
    if (serverInstance && serverInstance.close) await new Promise((res) => serverInstance.close(res));
  } catch (e) {}
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('socket auth accepts valid token and rejects missing token', (done) => {
  const User = require('../models/User');

  (async () => {
    const user = await User.create({ email: `sock-${Date.now()}@example.com`, password: 'Pass1234', name: 'Sock' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const port = serverInstance.address().port;
    const url = `http://localhost:${port}`;

    // first try connecting without token -> should error
    const badSocket = ioClient(url, { transports: ['websocket'], reconnection: false });
    badSocket.on('connect_error', (err) => {
      // expect authentication error
      expect(err).toBeTruthy();
      badSocket.close();

      // now try with token
      const goodSocket = ioClient(url, { transports: ['websocket'], reconnection: false, auth: { token } });
      goodSocket.on('connect', () => {
        expect(goodSocket.connected).toBe(true);
        goodSocket.close();
        done();
      });
      goodSocket.on('connect_error', (e) => {
        // fail the test if connect_error for good socket
        done(e || new Error('connect_error on good socket'));
      });
    });
  })();
});
