const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

export async function apiFetch(path, opts = {}) {
  const token = (() => {
    try { return localStorage.getItem('token'); } catch (e) { return null; }
  })();

  const headers = Object.assign({}, opts.headers || {});
  if (!headers['Content-Type'] && !(opts && opts.body && headers['Content-Type'] === undefined)) {
    // leave Content-Type unset for non-JSON bodies
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  return res;
}

export default apiFetch;
