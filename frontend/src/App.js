import CodeEditor from './components/Editor/CodeEditor';
import FileTree from './components/Editor/FileTree';
import LanguageSelector from './components/Editor/LanguageSelector';
import './App.css';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import apiFetch from './services/api';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

function App() {
  const [language, setLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const projectId = '690f4cd7d4cabc914608a3cf'; // Your project ID
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5050';
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('token'));
    const [authUser, setAuthUser] = useState(() => {
      try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    });
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
  
  const [files, setFiles] = useState([
    {
      _id: '1',
      name: 'App.js',
      type: 'file',
      parentFolderId: null,
      language: 'javascript',
      content: "console.log('Hello from App.js');",
    },
    {
      _id: '2',
      name: 'src',
      type: 'folder',
      parentFolderId: null,
    },
    {
      _id: '3',
      name: 'index.js',
      type: 'file',
      parentFolderId: '2',
      language: 'javascript',
      content: "// Index file\nconsole.log('Index');",
    },
    {
      _id: '4',
      name: 'README.md',
      type: 'file',
      parentFolderId: null,
      language: 'markdown',
      content: '# My Project\n\nThis is a test project.',
    },
  ]);

  // socket.io: connect and listen for file events to keep UI in sync
  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'], auth: { token: authToken } });
    socket.on('connect', () => {
      console.log('socket connected', socket.id);
      // join project room for scoped events
      socket.emit('join-project', projectId);
    });

    socket.on('file:created', (file) => {
      console.log('socket file:created', file);
      setFiles((prev) => {
        // avoid duplicates: if file with same _id exists, skip
        if (prev.some((f) => String(f._id) === String(file._id))) return prev;
        return [...prev.filter((f) => !(f.name === file.name && (f.parentFolderId || null) === (file.parentFolderId || null) && String(f._id).length > 10)), file];
      });
    });

    socket.on('file:updated', (file) => {
      console.log('socket file:updated', file);
      setFiles((prev) => prev.map((f) => (String(f._id) === String(file._id) ? file : f)));
      if (selectedFile && String(selectedFile._id) === String(file._id)) {
        setSelectedFile(file);
      }
    });

    socket.on('file:deleted', ({ fileId }) => {
      console.log('socket file:deleted', fileId);
      setFiles((prev) => prev.filter((f) => f._id !== fileId && f.parentFolderId !== fileId));
      if (selectedFile && selectedFile._id === fileId) setSelectedFile(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [API, selectedFile, authToken]);

  // load project files on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/projects/${projectId}/tree`);
        if (!res.ok) throw new Error('Failed to load project files');
        const data = await res.json();
        setFiles(data);
      } catch (e) {
        console.warn('Could not load project tree:', e.message);
      }
    };

    load();
  }, [projectId, authToken]);

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setLanguage(file.language || 'javascript');
  };

  // auth handlers
  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    try { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthUser(null);
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
    // reload to reset socket connection and state
    window.location.reload();
  };

  const handleCreateFile = async () => {
    const fileName = prompt('Enter file name (e.g., test.js):');
    if (!fileName) return;

    const newFile = {
      _id: Date.now().toString(),
      name: fileName,
      type: 'file',
      parentFolderId: null,
      language: 'javascript',
      content: '',
    };
    // optimistically update UI
    setFiles((prev) => [...prev, newFile]);

    try {
      const response = await apiFetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      const savedFile = await response.json();
      console.log('✅ File saved:', savedFile);
      // replace any optimistic entry with the saved file (match by name+parent)
      setFiles((prev) => {
        const withoutTemp = prev.filter((f) => !(f.name === savedFile.name && (f.parentFolderId || null) === (savedFile.parentFolderId || null) && String(f._id).length > 10));
        return [...withoutTemp, savedFile];
      });
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Failed to save file to backend');
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const newFolder = {
      _id: Date.now().toString(),
      name: folderName,
      type: 'folder',
      parentFolderId: null,
    };

    setFiles([...files, newFolder]);

    try {
      const response = await apiFetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolder),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const savedFolder = await response.json();
      console.log('✅ Folder saved:', savedFolder);
      setFiles((prev) => {
        const withoutTemp = prev.filter((f) => !(f.name === savedFolder.name && (f.parentFolderId || null) === (savedFolder.parentFolderId || null) && String(f._id).length > 10));
        return [...withoutTemp, savedFolder];
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to save folder to backend');
    }
  };

  const handleDeleteFile = async (fileId) => {
    
    const updatedFiles = files.filter((file) => {
      return file._id !== fileId && file.parentFolderId !== fileId;
    });
    setFiles(updatedFiles);
    setSelectedFile(null);

   
    try {
      const response = await apiFetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      console.log('✅ File deleted');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file from backend');
    }
  };

  
  const handleRenameFile = async (fileId) => {
    const file = files.find((f) => f._id === fileId);
    if (!file) return;

    const newName = prompt('Enter new name:', file.name);
    if (!newName) return;

    const updatedFiles = files.map((f) =>
      f._id === fileId ? { ...f, name: newName } : f
    );
    setFiles(updatedFiles);

    
    try {
      const response = await apiFetch(`/api/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename file');
      }

      const updatedFile = await response.json();
      console.log('✅ File renamed:', updatedFile);
    } catch (error) {
      console.error('Error renaming file:', error);
      alert('Failed to rename file in backend');
    }
  };

  return (
    <div className="App">
      <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>Collaborative Code Editor</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateFile} style={{ padding: '8px 12px', background: '#007ACC', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ New File</button>
            <button onClick={handleCreateFolder} style={{ padding: '8px 12px', background: '#007ACC', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ New Folder</button>
          </div>
          <div>
            {authUser ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Hi, {authUser.name || authUser.email}</span>
                <button onClick={handleLogout} style={{ padding: '6px 10px' }}>Logout</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowLogin(true)} style={{ padding: '6px 10px' }}>Login</button>
                <button onClick={() => setShowRegister(true)} style={{ padding: '6px 10px' }}>Register</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {showLogin && <Login apiBase={API} onSuccess={handleAuthSuccess} onCancel={() => setShowLogin(false)} />}
      {showRegister && <Register apiBase={API} onSuccess={handleAuthSuccess} onCancel={() => setShowRegister(false)} />}

      <LanguageSelector
        language={language}
        onLanguageChange={setLanguage}
      />
      <div style={{ display: 'flex', height: '90vh' }}>
        <FileTree 
          files={files}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          projectId={projectId}
        />
        <CodeEditor 
          language={language}
          selectedFile={selectedFile}
        />
      </div>
    </div>
  );
}

export default App;