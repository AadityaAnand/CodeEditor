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

test('file CRUD and access control', async () => {
  const User = require('../models/User');
  const Project = require('../models/Project');
  const File = require('../models/File');

  // create users: owner, collaborator, outsider
  const owner = await User.create({ email: `owner-${Date.now()}@example.com`, password: 'Pass1234', name: 'Owner' });
  const collaborator = await User.create({ email: `collab-${Date.now()}@example.com`, password: 'Pass1234', name: 'Collab' });
  const outsider = await User.create({ email: `out-${Date.now()}@example.com`, password: 'Pass1234', name: 'Out' });

  const ownerToken = jwt.sign({ id: owner._id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const collabToken = jwt.sign({ id: collaborator._id, email: collaborator.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const outToken = jwt.sign({ id: outsider._id, email: outsider.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // owner creates a project
  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Files Project' });
  expect(projRes.status).toBe(201);
  const projectId = projRes.body._id;

  // owner creates a file under the project (route: POST /api/projects/:projectId/files)
  const fileCreate = await request(app)
    .post(`/api/projects/${projectId}/files`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'hello.txt', type: 'file', content: 'hello', language: 'text' });

  expect(fileCreate.status).toBe(201);
  const fileId = fileCreate.body._id;

  // owner updates the file
  const updateRes = await request(app)
    .put(`/api/files/${fileId}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ content: 'owner edit' });
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.content).toBe('owner edit');

  // add collaborator to project directly in DB (project model stores collaborators array)
  const proj = await Project.findById(projectId);
  proj.collaborators.push({ userId: collaborator._id, role: 'editor' });
  await proj.save();

  // collaborator should be able to update file
  const collabUpdate = await request(app)
    .put(`/api/files/${fileId}`)
    .set('Authorization', `Bearer ${collabToken}`)
    .send({ content: 'collab edit' });
  expect(collabUpdate.status).toBe(200);
  expect(collabUpdate.body.content).toBe('collab edit');

  // outsider should NOT be able to update the file
  const outUpdate = await request(app)
    .put(`/api/files/${fileId}`)
    .set('Authorization', `Bearer ${outToken}`)
    .send({ content: 'bad edit' });
  // expecting 401 or 403 depending on access enforcement
  expect([401, 403]).toContain(outUpdate.status);

  // ensure file content in DB is still collab edit
  const fresh = await File.findById(fileId);
  expect(fresh.content).toBe('collab edit');
});
