const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

export async function ensureAuthToken() {
  try {
    const existing = localStorage.getItem('token');
    if (existing && typeof existing === 'string' && existing.length > 10) return existing;

    const suffix = Math.random().toString(36).slice(2, 8);
    const email = `dev_${suffix}@example.com`;
    const body = JSON.stringify({ email, password: 'password', name: 'Dev User' });

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      // try login in case the random email already existed (unlikely)
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' }),
      });
      if (!loginRes.ok) throw new Error(await loginRes.text());
      const loginData = await loginRes.json();
      if (loginData && loginData.token) {
        localStorage.setItem('token', loginData.token);
        return loginData.token;
      }
      throw new Error('Login did not return a token');
    }
    const data = await res.json();
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      return data.token;
    }
    throw new Error('Register did not return a token');
  } catch (err) {
    console.warn('ensureAuthToken failed:', err && err.message ? err.message : err);
    return null;
  }
}

export default ensureAuthToken;
