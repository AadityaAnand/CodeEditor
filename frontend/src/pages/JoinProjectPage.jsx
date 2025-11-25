import React, { useState } from 'react';
import apiFetch from '../services/api';
import showToast from '../services/toast';

export default function JoinProjectPage({ apiBase, authToken }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const extractToken = (raw) => {
    if (!raw) return '';
    // allow full URL or just token
    const match = raw.match(/share\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return raw.trim();
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const token = extractToken(input);
    if (!token) return;
    setLoading(true);
    try {
      const validate = await apiFetch(`/api/share/validate/${token}`);
      if (!validate.ok) {
        showToast('Invalid or expired share link', { type: 'error' });
        return;
      }
      const info = await validate.json();
      if (!authToken) {
        try { localStorage.setItem('pendingShareToken', token); } catch (e) {}
        showToast('Please login to complete joining the project', { type: 'info' });
        window.location.href = '/login';
        return;
      }
      const joinRes = await apiFetch(`/api/share/${info.projectId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (joinRes.ok) {
        showToast('Joined project successfully', { type: 'success' });
        window.location.href = '/';
      } else {
        showToast('Failed to join project', { type: 'error' });
      }
    } catch (err) {
      showToast(err.message || 'Join failed', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <div className="join-card">
        <h2>Join a Shared Project</h2>
        <p>Paste the share link or token you received.</p>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="join-input"
            placeholder="https://your-backend/share/abcd1234 or token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input || loading} className="primary-btn">
            {loading ? 'Joining...' : 'Join Project'}
          </button>
        </form>
        <div className="hint">Need an account? <a href="/register">Register</a></div>
      </div>
    </div>
  );
}
