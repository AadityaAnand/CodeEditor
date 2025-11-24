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

test('share token create -> validate -> join', async () => {
  const User = require('../models/User');
  const Project = require('../models/Project');

  // create owner and other user
  const owner = await User.create({ email: `owner-${Date.now()}@example.com`, password: 'Pass1234', name: 'Owner' });
  const other = await User.create({ email: `other-${Date.now()}@example.com`, password: 'Pass1234', name: 'Other' });

  const ownerToken = jwt.sign({ id: owner._id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const otherToken = jwt.sign({ id: other._id, email: other.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // owner creates a project
  const createRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Share Project' });
  expect(createRes.status).toBe(201);
  const projectId = createRes.body._id;

  // owner creates a share token
  const shareRes = await request(app)
    .post(`/api/share/${projectId}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ role: 'editor', ttlHours: 1 });
  expect(shareRes.status).toBe(201);
  expect(shareRes.body).toHaveProperty('token');
  const token = shareRes.body.token;

  // validate token (public endpoint)
  const validate = await request(app).get(`/api/share/validate/${token}`);
  expect(validate.status).toBe(200);
  expect(validate.body).toHaveProperty('projectId', projectId);

  // other user joins using token
  const joinRes = await request(app)
    .post(`/api/share/${projectId}/join`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ token });
  expect(joinRes.status).toBe(200);
  expect(joinRes.body).toHaveProperty('message', 'Joined project');

  // verify other user now appears as collaborator on project
  const updated = await Project.findById(projectId);
  expect(updated.collaborators.some((c) => String(c.userId) === String(other._id))).toBe(true);
});
