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
      // swallow
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="project-selector">
      <div className="project-select-wrap">
        <select value={selectedProjectId || ''} onChange={(e) => onSelect(e.target.value)}>
          <option value="">Select project…</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="project-create">
        <input
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={creating}
        />
        <button onClick={handleCreate} disabled={creating || !name} className="secondary-btn small">
          {creating ? '…' : 'Create'}
        </button>
      </div>
    </div>
  );
}
