const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

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
});

afterAll(async () => {
  try {
    if (serverInstance && serverInstance.close) await new Promise((res) => serverInstance.close(res));
  } catch (e) {}
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('register -> login -> me flow', async () => {
  const email = `ci-${Date.now()}@example.com`;
  const password = 'Pass1234';
  const name = 'Test User';

  // register
  const regRes = await request(app)
    .post('/auth/register')
    .send({ email, password, name });

  expect(regRes.status).toBe(201);
  expect(regRes.body).toHaveProperty('token');
  expect(regRes.body).toHaveProperty('user');
  expect(regRes.body.user.email).toBe(email);

  // login
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email, password });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body).toHaveProperty('token');
  const token = loginRes.body.token;

  // me
  const meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);

  expect(meRes.status).toBe(200);
  expect(meRes.body).toHaveProperty('email', email);
  expect(meRes.body).not.toHaveProperty('password');
});
