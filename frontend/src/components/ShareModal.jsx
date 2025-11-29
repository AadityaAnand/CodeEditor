import React, { useEffect, useState } from 'react';
import apiFetch from '../services/api';
import showToast from '../services/toast';

export default function ShareModal({ apiBase, projectId, onClose, currentRole }) {
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const disabled = !projectId;

  const load = async () => {
    if (!projectId) return;
    try {
      const res = await apiFetch(`/api/projects/${projectId}/collaborators`);
      if (!res.ok) return;
      setCollaborators(await res.json());
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, [projectId]);

  const invite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) });
      if (!res.ok) throw new Error('Invite failed');
      showToast('Collaborator invited', { type: 'success' });
      setEmail('');
      load();
    } catch (e) { showToast(e.message || 'Invite failed', { type: 'error' }); } finally { setLoading(false); }
  };

  const createLink = async () => {
    if (!projectId) return;
    setLinkLoading(true);
    try {
      const res = await apiFetch(`/api/share/${projectId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'editor', ttlHours: 72 }) });
      if (!res.ok) throw new Error('Share link failed');
      const body = await res.json();
      const url = `${apiBase}/share/${body.token}`;
      try { await navigator.clipboard.writeText(url); } catch (e) {}
      showToast('Share link copied', { type: 'success' });
    } catch (e) { showToast(e.message || 'Share link failed', { type: 'error' }); } finally { setLinkLoading(false); }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 3000 }}>
      <div className="modal" style={{ maxWidth: 520, width: '100%', background: '#0f1825', color: '#fff', border: '1px solid #1e3a4f' }}>
        <h3 style={{ marginTop: 0 }}>Share Project</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Invite by email with a role, or copy a time-limited share link.</p>
        <div style={{ fontSize: 12, color: '#60a5fa', background: '#1e3a8a', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          💡 <strong>Share Link:</strong> Recipients can paste the link at <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>/join</code> to access the project
        </div>
        <form onSubmit={invite} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" style={{ flex: 2 }} disabled={loading || disabled} />
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading || disabled} style={{ flex: 1 }}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button type="submit" disabled={loading || disabled} className="primary-btn" style={{ flex: 1 }}>{loading ? 'Inviting...' : 'Invite'}</button>
        </form>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button onClick={createLink} disabled={linkLoading || disabled} className="secondary-btn" style={{ flex: 1 }}>{linkLoading ? 'Creating...' : 'Copy Share Link'}</button>
          <button onClick={onClose} className="secondary-btn" style={{ flex: 1 }}>Close</button>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Collaborators</div>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #1e3a4f', borderRadius: 8, padding: 8, background: '#132637' }}>
            {collaborators.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>None yet</div>}
            {collaborators.map(c => (
              <div key={c.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#0d2538', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13 }}>{c.name || c.email}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{c.email}</span>
                </div>
                <span style={{ fontSize: 11, padding: '4px 8px', background: c.role === 'viewer' ? '#334155' : '#2563eb', color: '#fff', borderRadius: 12 }}>{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
