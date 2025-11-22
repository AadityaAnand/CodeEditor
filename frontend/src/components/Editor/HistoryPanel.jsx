import React, { useEffect, useState } from 'react';
import apiFetch from '../../services/api';

export default function HistoryPanel({ fileId, onClose, onRevert }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiFetch(`/api/files/${fileId}/history`);
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        setVersions(data || []);
      } catch (e) {
        setError(e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId]);

  const handleRevert = async (versionId) => {
  if (!fileId || !versionId) return;
  if (!window.confirm('Revert to this version? This will create a new snapshot of the current content.')) return;
    try {
      setReverting(true);
      const res = await apiFetch(`/api/files/${fileId}/revert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versionId }) });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to revert');
      }
      const data = await res.json();
      alert('Reverted successfully');
      // inform parent to refresh file content
      if (onRevert) {
        try { onRevert(data.file); } catch (e) {}
      }
      onClose && onClose();
    } catch (e) {
      alert('Revert failed: ' + (e.message || 'unknown'));
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>File History</h3>
        <button onClick={onClose}>Close</button>
      </div>
      {loading ? <div>Loading...</div> : null}
      {error ? <div style={{ color: 'red' }}>{error}</div> : null}
      {!loading && !error && (
        <div className="history-list">
          {versions.length === 0 && <div className="muted">No versions available</div>}
          {versions.map((v) => (
            <div key={v._id} className="history-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#999' }}>{new Date(v.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: 13 }}>{(v.userId && (v.userId.name || v.userId.email)) || (v.userId ? String(v.userId) : 'Unknown')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleRevert(v._id)} disabled={reverting}>Revert</button>
                </div>
              </div>
              <pre className="history-preview">{(v.content || '').slice(0, 400)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
