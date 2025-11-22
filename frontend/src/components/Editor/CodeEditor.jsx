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
    monacoRef.current = monaco;
    console.log('Editor mounted');
  };

  // helper: manage decorations for remote cursors
  const decorationsRef = useRef([]);
  const monacoRef = useRef(null);
  // map socketId -> { widget, dom, className }
  const remoteWidgetsRef = useRef({});
  // a <style> element to inject per-user CSS for caret color
  const styleElRef = useRef(null);

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

  // emit cursor position (throttled via requestAnimationFrame)
  const pendingCursor = useRef(null);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onCursorChange = () => {
      if (!selectedFile) return;
      const pos = editor.getPosition();
      if (!pos) return;
      const cursor = { lineNumber: pos.lineNumber, column: pos.column };
      // throttle via RAF
      pendingCursor.current = cursor;
    };

    const rafTicker = () => {
      if (pendingCursor.current && selectedFile) {
        try {
          const socket = getSocket();
          socket.emit('presence:cursor', { fileId: selectedFile._id, cursor: pendingCursor.current });
        } catch (e) { console.warn('emit cursor failed', e.message); }
        pendingCursor.current = null;
      }
      requestAnimationFrame(rafTicker);
    };

    editor.onDidChangeCursorPosition(onCursorChange);
    const rafId = requestAnimationFrame(rafTicker);

    return () => {
      try { editor.offDidChangeCursorPosition(onCursorChange); } catch (e) {}
      cancelAnimationFrame(rafId);
    };
  }, [selectedFile]);

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
    const onPresenceUpdate = (users) => {
      setPresenceUsers(users || []);
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      // ensure style element exists for per-user caret CSS
      if (!styleElRef.current) {
        const el = document.createElement('style');
        el.setAttribute('data-remote-cursors', 'true');
        document.head.appendChild(el);
        styleElRef.current = el;
      }

      const decorations = [];
      const keepWidgetIds = new Set();

      (users || []).forEach((u) => {
        if (!u.cursor || !u.cursor.lineNumber) return;
        // skip our own socket entry
        if (u.socketId === (socket && socket.id)) return;

        // create per-user classname and CSS for caret color
        const safeId = String(u.socketId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const className = `remote_cursor_before_${safeId}`;
        const color = getColorForString(u.userId || u.socketId || u.name || safeId);
        const cssRule = `.${className}::before { content: ''; display:inline-block; width:0px; height:1em; margin-left:-1px; border-left:2px solid ${color}; position:relative; top:0px; }`;
        if (styleElRef.current && !styleElRef.current.innerHTML.includes(className)) {
          styleElRef.current.innerHTML += cssRule;
        }

        // add decoration to show caret at cursor position
        const range = new monaco.Range(u.cursor.lineNumber, u.cursor.column, u.cursor.lineNumber, u.cursor.column);
        decorations.push({ range, options: { beforeContentClassName: className } });

        // manage name badge widget
        try {
          let entry = remoteWidgetsRef.current[u.socketId];
          if (entry && entry.widget) {
            // update dom content and style
            entry.dom.textContent = u.name || 'Anon';
            entry.dom.style.background = color;
            // request reposition by updating widget's getPosition (we store as function)
            entry.getPosition = () => ({ position: { lineNumber: u.cursor.lineNumber, column: Math.max(1, u.cursor.column) }, preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE] });
            try { editor.layoutContentWidget(entry.widget); } catch (e) {}
          } else {
            const dom = document.createElement('div');
            dom.className = 'remote-caret-badge';
            dom.textContent = u.name || 'Anon';
            dom.style.background = color;
            dom.style.color = '#fff';
            dom.style.padding = '2px 6px';
            dom.style.fontSize = '11px';
            dom.style.borderRadius = '8px';
            dom.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

            const widget = {
              getId: () => `remote.caret.widget.${safeId}`,
              getDomNode: () => dom,
              getPosition: () => ({ position: { lineNumber: u.cursor.lineNumber, column: Math.max(1, u.cursor.column) }, preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE] }),
            };
            try { editor.addContentWidget(widget); } catch (e) {}
            remoteWidgetsRef.current[u.socketId] = { widget, dom, className, getPosition: widget.getPosition };
          }
          keepWidgetIds.add(u.socketId);
        } catch (e) {
          // ignore widget errors
        }
      });

      try {
        // apply decorations (replace previous set)
        const ids = editor.deltaDecorations(decorationsRef.current || [], decorations);
        decorationsRef.current = ids;
      } catch (e) {
        // ignore
      }

      // remove widgets that are no longer present
      for (const sid of Object.keys(remoteWidgetsRef.current)) {
        if (!keepWidgetIds.has(sid)) {
          try { editor.removeContentWidget(remoteWidgetsRef.current[sid].widget); } catch (e) {}
          delete remoteWidgetsRef.current[sid];
        }
      }
    };

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
      // clear decorations
      try {
        const editor = editorRef.current;
        if (editor) editor.deltaDecorations(decorationsRef.current || [], []);
      } catch (e) {}
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

// simple hash -> color utility
function getColorForString(s) {
  let h = 0;
  if (!s) s = Math.random().toString(36).slice(2);
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 85% 45%)`;
}

export default CodeEditor;