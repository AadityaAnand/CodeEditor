import { useRef, useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';

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

  const handleEditorChange = (value) => {
    setCode(value);
  };

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