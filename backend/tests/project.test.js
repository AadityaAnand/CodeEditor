const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

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

test('project CRUD: create, list (owner vs other), get by id, auth required', async () => {
  const User = require('../models/User');
  const Project = require('../models/Project');

  // create two users
  const owner = await User.create({ email: `owner-${Date.now()}@example.com`, password: 'Pass1234', name: 'Owner' });
  const other = await User.create({ email: `other-${Date.now()}@example.com`, password: 'Pass1234', name: 'Other' });

  const ownerToken = jwt.sign({ id: owner._id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const otherToken = jwt.sign({ id: other._id, email: other.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // create a project as owner
  const createRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Owner Project', description: 'A test project' });

  expect(createRes.status).toBe(201);
  expect(createRes.body).toHaveProperty('_id');
  const projectId = createRes.body._id;

  // owner should see it in their list
  const ownerList = await request(app).get('/api/projects').set('Authorization', `Bearer ${ownerToken}`);
  expect(ownerList.status).toBe(200);
  expect(Array.isArray(ownerList.body)).toBe(true);
  expect(ownerList.body.some((p) => p._id === projectId)).toBe(true);

  // other user should NOT see it in their list
  const otherList = await request(app).get('/api/projects').set('Authorization', `Bearer ${otherToken}`);
  expect(otherList.status).toBe(200);
  expect(Array.isArray(otherList.body)).toBe(true);
  expect(otherList.body.some((p) => p._id === projectId)).toBe(false);

  // get by id (route does not enforce membership) should return project for authenticated user
  const getRes = await request(app).get(`/api/projects/${projectId}`).set('Authorization', `Bearer ${otherToken}`);
  expect(getRes.status).toBe(200);
  expect(getRes.body).toHaveProperty('_id', projectId);

  // unauthenticated requests should be rejected
  const unauth = await request(app).get('/api/projects');
  expect(unauth.status).toBe(401);
});
