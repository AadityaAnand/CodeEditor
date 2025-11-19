import React, { useState } from 'react';

export default function Register({ apiBase, onSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Register failed');
      onSuccess(body.token, body.user);
    } catch (err) {
      setError(err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h3>Register</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={submit}>
        <div>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>Create account</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
