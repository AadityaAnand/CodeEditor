/*
  Simple smoke test script for deployed backend.
  Usage:
    BACKEND_URL=https://your-backend.onrender.com node scripts/smoke.js

  The script will:
  - register a new user
  - login
  - create a project
  - create a file
  - fetch file history

  Exit code 0 on success, non-zero on failure.
*/

(async () => {
  try {
    const base = process.env.BACKEND_URL;
    if (!base) throw new Error('Please set BACKEND_URL environment variable');

    const rand = Date.now();
    const email = `smoke+${rand}@example.com`;
    const password = 'SmokeTest123!';

    const log = (...args) => console.log('[smoke]', ...args);

    log('Registering user', email);
    let res = await fetch(new URL('/auth/register', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Smoke Tester' }),
    });
    if (![200,201].includes(res.status)) {
      const body = await res.text();
      throw new Error('Register failed: ' + res.status + ' ' + body);
    }

    log('Logging in');
    res = await fetch(new URL('/auth/login', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error('Login failed: ' + res.status);
    const login = await res.json();
    const token = login.token;
    if (!token) throw new Error('No token returned from login');

    log('Creating project');
    res = await fetch(new URL('/api/projects', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Smoke Project' }),
    });
    if (res.status !== 201) throw new Error('Create project failed: ' + res.status);
    const project = await res.json();

    log('Creating file');
    res = await fetch(new URL(`/api/projects/${project._id}/files`, base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'smoke.txt', type: 'file', content: 'hello', language: 'text' }),
    });
    if (res.status !== 201) throw new Error('Create file failed: ' + res.status);
    const file = await res.json();

    log('Fetching history');
    res = await fetch(new URL(`/api/files/${file._id}/history`, base), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) throw new Error('Get history failed: ' + res.status);
    const history = await res.json();

    log('Smoke test success — projectId:', project._id, 'fileId:', file._id, 'history length:', history.length);
    process.exit(0);
  } catch (err) {
    console.error('[smoke] Error:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
