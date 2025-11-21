import { useRef, useState, useEffect } from 'react';
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
        const socket = window.__appSocket;
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

    const socket = window.__appSocket;
    if (socket) socket.on('file:updated', onFileUpdated);
    // cleanup
    return () => {
      if (socket) socket.off('file:updated', onFileUpdated);
    };
  }, [selectedFile, code]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {selectedFile && (
        <div style={{
          padding: '10px 20px',
          background: '#2d2d2d',
          borderBottom: '1px solid #444',
          color: '#fff',
          fontSize: '14px'
        }}>
          📄 {selectedFile.name}
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