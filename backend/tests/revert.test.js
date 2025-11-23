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
  // require server after setting MONGODB_URI so it connects to the in-memory server
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

test('revert endpoint restores historical content', async () => {
  const User = require('../models/User');
  const Project = require('../models/Project');
  const File = require('../models/File');
  const Version = require('../models/Version');
  const jwt = require('jsonwebtoken');

  const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';

  // create a user
  const user = await User.create({ email: `ci-${Date.now()}@example.com`, password: 'Pass1234', name: 'CI User' });
  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  const project = await Project.create({ name: 'Test Project', owner: user._id });

  const file = await File.create({ name: 'test.js', type: 'file', content: 'current', language: 'javascript', projectId: project._id });

  // create an older version
  const prior = await Version.create({ fileId: file._id, projectId: project._id, content: 'older content', language: 'javascript', userId: user._id });

  // call revert
  const res = await request(app)
    .post(`/api/files/${file._id}/revert`)
    .set('Authorization', `Bearer ${token}`)
    .send({ versionId: prior._id });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('file');
  expect(res.body.file.content).toBe('older content');

  // ensure the file in DB is updated
  const fresh = await File.findById(file._id);
  expect(fresh.content).toBe('older content');
});
