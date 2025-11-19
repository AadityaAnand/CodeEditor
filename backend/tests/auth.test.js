const request = require('supertest');
const { app, server } = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');

// NOTE: these tests require a running MongoDB at MONGODB_URI used by server

beforeAll(async () => {
  // ensure test DB is reachable
  // Optionally clear users collection
  try {
    await User.deleteMany({});
  } catch (e) {
    // ignore
  }
});

afterAll(async () => {
  // close server and mongoose connection
  try {
    await mongoose.connection.close();
  } catch (e) {}
  try {
    server && server.close();
  } catch (e) {}
});

describe('Auth routes', () => {
  const testUser = { email: 'test+ci@example.com', password: 'password123', name: 'CI Test' };

  test('POST /auth/register -> 201', async () => {
    const res = await request(app).post('/auth/register').send(testUser).timeout(10000);
    expect([201, 409]).toContain(res.status); // permit existing user across runs
    if (res.status === 201) {
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    }
  });

  test('POST /auth/login -> 200', async () => {
    const res = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password }).timeout(10000);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });
});
