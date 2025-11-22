import CodeEditor from './components/Editor/CodeEditor';
import FileTree from './components/Editor/FileTree';
import LanguageSelector from './components/Editor/LanguageSelector';
import './App.css';
import { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import apiFetch from './services/api';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProjectSelector from './components/ProjectSelector';

function App() {
  const [language, setLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    try { return localStorage.getItem('selectedProjectId'); } catch (e) { return null; }
  });
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
    const socket = getSocket(authToken);
    // expose socket globally for editor components to reuse (backwards compat)
    try { window.__appSocket = socket; window.dispatchEvent(new Event('socket-ready')); } catch (e) {}
    socket.on('connect', () => {
      console.log('socket connected', socket.id);
      // join project room for scoped events
      if (selectedProjectId) socket.emit('join-project', selectedProjectId);
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
  }, [API, selectedFile, authToken, selectedProjectId]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedProjectId) return;
        const res = await apiFetch(`/api/projects/${selectedProjectId}/tree`);
        if (!res.ok) throw new Error('Failed to load project files');
        const data = await res.json();
        setFiles(data);
      } catch (e) {
        console.warn('Could not load project tree:', e.message);
      }
    };

    load();
  }, [selectedProjectId, authToken]);

  // validate token and load user/projects on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!authToken) return;
        const res = await apiFetch('/auth/me');
        if (!res.ok) { handleLogout(); return; }
        const user = await res.json();
        setAuthUser(user);

        // load user's projects
        const pRes = await apiFetch('/api/projects');
        if (pRes.ok) {
          const list = await pRes.json();
          setProjects(list || []);
          if (!selectedProjectId && list && list.length) {
            setSelectedProjectId(String(list[0]._id));
            try { localStorage.setItem('selectedProjectId', String(list[0]._id)); } catch (e) {}
          }
        }
        // if there is a pending share token (user visited /share/:token while logged out), try to join
        try {
          const pending = localStorage.getItem('pendingShareToken');
          if (pending) {
            const validate = await apiFetch(`/api/share/validate/${pending}`);
            if (validate.ok) {
              const body = await validate.json();
              // attempt join
              const jRes = await apiFetch(`/api/share/${body.projectId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: pending }) });
              if (jRes.ok) {
                localStorage.removeItem('pendingShareToken');
                // reload projects
                const p2 = await apiFetch('/api/projects');
                if (p2.ok) {
                  const list2 = await p2.json();
                  setProjects(list2 || []);
                }
                alert('Joined project via share link');
              }
            }
          }
        } catch (e) { console.warn('pending share join failed', e.message); }
      } catch (e) {
        console.warn('Auth init failed', e.message);
      }
    };

    initAuth();
  }, [authToken]);

  // detect share token in URL (e.g. /share/<token>) and handle
  useEffect(() => {
    try {
      const path = window.location.pathname || '';
      if (path.startsWith('/share/')) {
        const token = path.split('/share/')[1];
        if (!token) return;
        // if logged in, try to validate and join
        (async () => {
          try {
            const v = await apiFetch(`/api/share/validate/${token}`);
            if (!v.ok) {
              alert('Invalid or expired share link');
              return;
            }
            const info = await v.json();
            if (!authToken) {
              // store and prompt login
              try { localStorage.setItem('pendingShareToken', token); } catch (e) {}
              alert('Please login to join the shared project. After login we will complete the join.');
            } else {
              const jRes = await apiFetch(`/api/share/${info.projectId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
              if (jRes.ok) {
                alert('Successfully joined shared project');
                // refresh projects
                const p2 = await apiFetch('/api/projects');
                if (p2.ok) setProjects(await p2.json());
                window.history.replaceState({}, document.title, '/');
              } else {
                alert('Failed to join shared project');
              }
            }
          } catch (e) { console.warn('share handling failed', e.message); }
        })();
      }
    } catch (e) {}
  }, [authToken]);

  // project selection handlers
  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId || null);
    try { localStorage.setItem('selectedProjectId', projectId || ''); } catch (e) {}
  };

  const handleCreateProject = async ({ name }) => {
    const res = await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    const proj = await res.json();
    const next = [...(projects || []), proj];
    setProjects(next);
    setSelectedProjectId(String(proj._id));
    try { localStorage.setItem('selectedProjectId', String(proj._id)); } catch (e) {}
  };

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
  const response = await apiFetch(`/api/projects/${selectedProjectId}/files`, {
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
  const response = await apiFetch(`/api/projects/${selectedProjectId}/files`, {
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ProjectSelector projects={projects} selectedProjectId={selectedProjectId} onSelect={handleSelectProject} onCreate={handleCreateProject} />
            <button onClick={async () => {
              try {
                if (!selectedProjectId) return alert('Select a project first');
                const res = await apiFetch(`/api/share/${selectedProjectId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'editor', ttlHours: 72 }) });
                if (!res.ok) throw new Error('Failed to create share link');
                const body = await res.json();
                const url = `${API}/share/${body.token}`;
                try { await navigator.clipboard.writeText(url); } catch (e) {}
                alert(`Share link copied to clipboard:\n${url}`);
              } catch (e) {
                console.warn('Share failed', e.message);
                alert('Failed to create share link');
              }
            }} style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Share</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateFile} style={{ padding: '8px 12px', background: '#007ACC', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ New File</button>
              <button onClick={handleCreateFolder} style={{ padding: '8px 12px', background: '#007ACC', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ New Folder</button>
            </div>
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
          projectId={selectedProjectId}
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