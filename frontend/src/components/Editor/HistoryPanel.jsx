import React, { useEffect, useState } from 'react';
import apiFetch from '../../services/api';

function ConfirmModal({ title, message, onConfirm, onCancel, busy }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20
    }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ zIndex: 21 }}>
        <h4>{title}</h4>
        <div style={{ marginTop: 8 }}>{message}</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={busy}>Cancel</button>
          <button onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPanel({ fileId, onClose, onRevert }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reverting, setReverting] = useState(false);
  const [confirmVersion, setConfirmVersion] = useState(null);

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

  const doRevert = async (versionId) => {
    if (!fileId || !versionId) return;
    try {
      setReverting(true);
      const res = await apiFetch(`/api/files/${fileId}/revert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versionId }) });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to revert');
      }
      const data = await res.json();
      // notify parent to refresh content
      if (onRevert) {
        try { onRevert(data.file); } catch (e) { console.warn(e); }
      }
      setConfirmVersion(null);
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Revert failed');
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="history-panel" role="dialog" aria-label="File history" aria-modal="false" style={{ position: 'relative' }}>
      <div className="history-header">
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>File History</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setVersions([])} title="Refresh" style={{ fontSize: 12 }}>↻</button>
          <button onClick={onClose} style={{ fontSize: 12 }}>✕</button>
        </div>
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
                  <button onClick={() => setConfirmVersion(v._id)} disabled={reverting}>Revert</button>
                </div>
              </div>
              <pre className="history-preview">{(v.content || '').slice(0, 400)}</pre>
            </div>
          ))}
        </div>
      )}

      {confirmVersion ? (
        <ConfirmModal
          title="Confirm revert"
          message="Revert to this version? This will create a new snapshot of the current content."
          busy={reverting}
          onCancel={() => setConfirmVersion(null)}
          onConfirm={() => doRevert(confirmVersion)}
        />
      ) : null}
    </div>
  );
}
