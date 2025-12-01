import React, { useState, useRef, useEffect } from 'react';
import apiFetch from '../services/api';
import showToast from '../services/toast';

export default function Terminal({ selectedFile, selectedProjectId }) {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const runCode = async () => {
    if (!selectedFile) {
      showToast('Please select a file to run', { type: 'error' });
      return;
    }

    setRunning(true);
    setOutput(prev => prev + `\n$ Running ${selectedFile.name}...\n`);

    try {
      // Prefer language inferred from file extension if it contradicts metadata
      const inferLanguageFromName = (name) => {
        if (!name || typeof name !== 'string') return null;
        const lower = name.toLowerCase();
        if (lower.endsWith('.py')) return 'python';
        if (lower.endsWith('.js')) return 'javascript';
        if (lower.endsWith('.ts')) return 'typescript';
        if (lower.endsWith('.java')) return 'java';
        if (lower.endsWith('.c')) return 'c';
        if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) return 'cpp';
        if (lower.endsWith('.html')) return 'html';
        if (lower.endsWith('.css')) return 'css';
        return null;
      };

      const extLang = inferLanguageFromName(selectedFile.name);
      const languageToRun = extLang || selectedFile.language || 'python';

      const res = await apiFetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedFile._id,
          language: languageToRun,
          code: selectedFile.content
        })
      });

      if (!res.ok) {
        const error = await res.text();
        setOutput(prev => prev + `Error: ${error}\n`);
        return;
      }

      const result = await res.json();
      setOutput(prev => prev + (result.output || result.error || 'No output\n'));
    } catch (err) {
      setOutput(prev => prev + `Error: ${err.message}\n`);
    } finally {
      setRunning(false);
    }
  };

  const clearOutput = () => setOutput('');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: '#1e1e1e',
      borderTop: '1px solid #333'
    }}>
      <div style={{ 
        padding: '8px 12px', 
        background: '#252526',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
          🖥️ Terminal Output
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={runCode}
            disabled={running || !selectedFile}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: running ? '#555' : '#0e639c',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: running ? 'wait' : 'pointer'
            }}
          >
            {running ? '⏳ Running...' : '▶️ Run'}
          </button>
          <button 
            onClick={clearOutput}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
      <div 
        ref={outputRef}
        style={{ 
          flex: 1, 
          padding: 12, 
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: 13,
          color: '#ccc',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {output || 'No output yet. Click "Run" to execute the current file.'}
      </div>
    </div>
  );
}
