import React, { useState } from 'react';

export default function ProjectSelector({ projects = [], selectedProjectId, onSelect, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name) return;
    setCreating(true);
    try {
      await onCreate({ name });
      setName('');
    } catch (e) {
      console.error('Create project failed', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={selectedProjectId || ''} onChange={(e) => onSelect(e.target.value)}>
        <option value="">Select project...</option>
        {projects.map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={handleCreate} disabled={creating || !name} style={{ padding: '6px 10px' }}>
          {creating ? 'Creating...' : 'New Project'}
        </button>
      </div>
    </div>
  );
}
