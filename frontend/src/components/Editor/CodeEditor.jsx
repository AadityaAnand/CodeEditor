import { useRef, useState, useEffect } from 'react';
import getSocket from '../../services/socket';
import MonacoEditor from '@monaco-editor/react';

// small debounce helper
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function CodeEditor({ language, selectedFile }) {
  const editorRef = useRef(null);
  const [code, setCode] = useState('');
  useEffect(() => {
    const savedCode = localStorage.getItem('editorCode');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);
  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '');
      localStorage.setItem('editorCode', selectedFile.content || '');
    }
  }, [selectedFile]);
  useEffect(() => {
    localStorage.setItem('editorCode', code);
  }, [code]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    console.log('Editor mounted');
  };

  // emit edits to socket (debounced)
  const emitEdit = useRef(null);
  useEffect(() => {
    emitEdit.current = debounce((fileId, content) => {
      try {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('file:edit', { fileId, content });
      } catch (e) {
        console.warn('emitEdit error', e.message);
      }
    }, 300);
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);
    if (selectedFile && emitEdit.current) {
      emitEdit.current(selectedFile._id, value);
    }
  };

  // listen for remote updates to keep the editor in sync
  useEffect(() => {
    const onFileUpdated = (file) => {
      if (!selectedFile) return;
      if (String(file._id) !== String(selectedFile._id)) return;
      // apply incoming content if it's different
      if (file.content !== code) {
        setCode(file.content || '');
      }
    };

    const socket = getSocket();
    if (socket) socket.on('file:updated', onFileUpdated);
    // cleanup
    return () => {
      if (socket) socket.off('file:updated', onFileUpdated);
    };
  }, [selectedFile, code]);

  // presence: join/leave and display viewers for the selected file
  const [presenceUsers, setPresenceUsers] = useState([]);
  const currentFileRef = useRef(null);
  useEffect(() => {
    const socket = getSocket();
    const onPresenceUpdate = (users) => setPresenceUsers(users || []);

    async function joinIfNeeded() {
      if (!selectedFile) return;
      // read user from localStorage if available
      let user = null;
      try {
        const raw = localStorage.getItem('user');
        user = raw ? JSON.parse(raw) : null;
      } catch (e) { user = null; }

      try {
        socket.emit('presence:join', { fileId: selectedFile._id, user: { id: (user && (user._id || user.id)) || null, name: user && (user.name || user.email) } });
        socket.on('presence:update', onPresenceUpdate);
        currentFileRef.current = selectedFile._id;
      } catch (e) {
        console.warn('presence join failed', e.message);
      }
    }

    joinIfNeeded();

    return () => {
      const prev = currentFileRef.current;
      if (prev) {
        try { socket.emit('presence:leave', { fileId: prev }); } catch (e) {}
        socket.off('presence:update', onPresenceUpdate);
      }
      currentFileRef.current = null;
      setPresenceUsers([]);
    };
  }, [selectedFile]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {selectedFile && (
        <div style={{
          padding: '10px 20px',
          background: '#2d2d2d',
          borderBottom: '1px solid #444',
          color: '#fff',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>📄 {selectedFile.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {presenceUsers && presenceUsers.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {presenceUsers.slice(0,5).map((u) => (
                  <div key={u.socketId} title={u.name} style={{ background: '#555', color: '#fff', padding: '4px 8px', borderRadius: 12, fontSize: 12 }}>
                    {u.name ? (u.name.length > 12 ? u.name.slice(0,12) + '…' : u.name) : 'Anon'}
                  </div>
                ))}
                {presenceUsers.length > 5 ? <div style={{ color: '#ddd', fontSize: 12 }}>+{presenceUsers.length - 5}</div> : null}
              </div>
            ) : (
              <div style={{ color: '#ccc', fontSize: 12 }}>No viewers</div>
            )}
          </div>
        </div>
      )}
      <div style={{ flex: 1, height: '100%' }}>
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme='vs-dark'
        />
      </div>
    </div>
  );
}

export default CodeEditor;