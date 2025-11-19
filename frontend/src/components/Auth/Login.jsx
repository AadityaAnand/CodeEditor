import React, { useState } from 'react';

export default function Login({ apiBase, onSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed');
      onSuccess(body.token, body.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h3>Sign in</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={submit}>
        <div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>Sign in</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
