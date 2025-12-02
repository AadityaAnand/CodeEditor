import CodeEditor from './components/Editor/CodeEditor';
import FileTree from './components/Editor/FileTree';
import LanguageSelector from './components/Editor/LanguageSelector';
import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { getSocket } from './services/socket';
import apiFetch from './services/api';
import showToast from './services/toast';
import ProjectSelector from './components/ProjectSelector';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JoinProjectPage from './pages/JoinProjectPage';
import ShareModal from './components/ShareModal';
// Terminal removed for editor-only mode

function App() {
  const [language, setLanguage] = useState('python');
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
  
  const [files, setFiles] = useState([
    {
      _id: '1',
      name: 'main.py',
      type: 'file',
      parentFolderId: null,
      language: 'python',
      content: "print('Hello from main.py')",
    },
    {
      _id: '2',
      name: 'src',
      type: 'folder',
      parentFolderId: null,
    },
    {
      _id: '3',
      name: 'index.py',
      type: 'file',
      parentFolderId: '2',
      language: 'python',
      content: "# Index file\nprint('Index')",
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

  // collaboration / sharing state
  const [currentProjectRole, setCurrentProjectRole] = useState(null);
  const [showShare, setShowShare] = useState(false);
  // projectPresence removed - was unused

  // auto-select first available file if none selected
  useEffect(() => {
    if (!selectedFile && files && files.length) {
      const firstFile = files.find(f => f.type === 'file');
      if (firstFile) setSelectedFile(firstFile);
    }
  }, [files, selectedFile]);

  // load collaborators & derive current role when project or auth changes
  useEffect(() => {
    (async () => {
      if (!authToken || !selectedProjectId) { setCurrentProjectRole(null); return; }
      try {
        const res = await apiFetch(`/api/projects/${selectedProjectId}/collaborators`);
        if (!res.ok) {
          // if forbidden, clear selection so user can pick a project they have access to
          if (res.status === 403) {
            setSelectedProjectId(null);
            try { localStorage.removeItem('selectedProjectId'); } catch (e) {}
            showToast('You do not have access to this project. Please select or create a project.', { type: 'error' });
          }
          return;
        }
        const list = await res.json();
        const userId = authUser && (authUser._id || authUser.id);
        const mine = list.find(c => String(c.userId) === String(userId));
        setCurrentProjectRole(mine ? mine.role : null);
      } catch (e) { /* ignore */ }
    })();
  }, [selectedProjectId, authToken, authUser]);

  // project presence listener removed (was unused)

  // socket.io: connect and listen for file events to keep UI in sync
  useEffect(() => {
    const socket = getSocket(authToken);
    // expose socket globally for editor components to reuse (backwards compat)
    try { window.__appSocket = socket; window.dispatchEvent(new Event('socket-ready')); } catch (e) {}
    
    const handleConnect = () => {
      console.log('socket connected', socket.id);
      // join project room for scoped events
      if (selectedProjectId) {
        console.log('Joining project room:', selectedProjectId);
        socket.emit('join-project', selectedProjectId);
      }
    };
    
    socket.on('connect', handleConnect);
    
    // If already connected, join immediately
    if (socket.connected && selectedProjectId) {
      console.log('Socket already connected, joining project:', selectedProjectId);
      socket.emit('join-project', selectedProjectId);
    }
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
      socket.off('connect', handleConnect);
      socket.off('file:created');
      socket.off('file:updated');
      socket.off('file:deleted');
      // Don't disconnect - let socket persist across component updates
    };
  }, [API, selectedFile, authToken, selectedProjectId]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedProjectId) return;
        const res = await apiFetch(`/api/projects/${selectedProjectId}/tree`);
        if (!res.ok) {
          if (res.status === 403) {
            setSelectedProjectId(null);
            try { localStorage.removeItem('selectedProjectId'); } catch (e) {}
            showToast('Access denied to selected project. Please choose another or create one.', { type: 'error' });
            return;
          }
          throw new Error('Failed to load project files');
        }
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
          let list = await pRes.json();
          // if no projects exist, auto-create a default one for a smoother first run
          if (!list || !list.length) {
            const created = await apiFetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'My First Project' }),
            });
            if (created.ok) {
              const proj = await created.json();
              list = [proj];
            }
          }
          setProjects(list || []);
          if ((!selectedProjectId || !list.some(p => String(p._id) === String(selectedProjectId))) && list && list.length) {
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
                showToast('Joined project via share link', { type: 'success' });
              }
            }
          }
        } catch (e) { console.warn('pending share join failed', e.message); }
      } catch (e) {
        console.warn('Auth init failed', e.message);
      }
    };

    initAuth();
  }, [authToken, selectedProjectId]);

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
              showToast('Invalid or expired share link', { type: 'error' });
              return;
            }
            const info = await v.json();
            if (!authToken) {
              // store and prompt login
              try { localStorage.setItem('pendingShareToken', token); } catch (e) {}
              showToast('Please login to join the shared project. After login we will complete the join.', { type: 'info' });
            } else {
              const jRes = await apiFetch(`/api/share/${info.projectId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
              if (jRes.ok) {
                showToast('Successfully joined shared project', { type: 'success' });
                // refresh projects
                const p2 = await apiFetch('/api/projects');
                if (p2.ok) setProjects(await p2.json());
                window.history.replaceState({}, document.title, '/');
              } else {
                showToast('Failed to join shared project', { type: 'error' });
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
    setLanguage(file.language || 'python');
  };

  // auth handlers
  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    try { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
    // redirect to home after auth
    window.location.href = '/';
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

    // ensure we have a project to save into
    if (!selectedProjectId) {
      try {
        await handleCreateProject({ name: 'My First Project' });
      } catch (e) {
        showToast('Please create/select a project first', { type: 'error' });
        return;
      }
    }

    const newFile = {
      _id: Date.now().toString(),
      name: fileName,
      type: 'file',
      parentFolderId: null,
      language: 'python',
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
        if (response.status === 401) {
          showToast('You are not authenticated. Please login.', { type: 'error' });
        }
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
      showToast('Failed to save file to backend', { type: 'error' });
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
      showToast('Failed to save folder to backend', { type: 'error' });
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
      showToast('Failed to delete file from backend', { type: 'error' });
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
      showToast('Failed to rename file in backend', { type: 'error' });
    }
  };

  return (
    <Router>
      <div className="App">
        <header className="header">
          <div>
            <h1>CodeEditor</h1>
            {/* tagline removed as requested */}
          </div>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Workspace</Link>
            <Link to="/join" className="nav-link">Join</Link>
            {!authUser && <Link to="/login" className="nav-link">Login</Link>}
            {!authUser && <Link to="/register" className="nav-link">Register</Link>}
            {authUser && <button onClick={handleLogout} className="nav-link btn-inline">Logout</button>}
          </nav>
        </header>
        <Routes>
          <Route path="/login" element={<LoginPage apiBase={API} onAuth={handleAuthSuccess} />} />
          <Route path="/register" element={<RegisterPage apiBase={API} onAuth={handleAuthSuccess} />} />
          <Route path="/join" element={<JoinProjectPage apiBase={API} authToken={authToken} />} />
          <Route path="/" element={(
            <div className="editor-shell">
              <div className="top-bar">
                <div className="project-bar">
                  <ProjectSelector projects={projects} selectedProjectId={selectedProjectId} onSelect={handleSelectProject} onCreate={handleCreateProject} />
                  <div className="project-actions">
                    <button onClick={() => setShowShare(true)} className="primary-btn">Share</button>
                    <button onClick={handleCreateFile} className="secondary-btn" disabled={currentProjectRole === 'viewer'}>+ File</button>
                    <button onClick={handleCreateFolder} className="secondary-btn" disabled={currentProjectRole === 'viewer'}>+ Folder</button>
                  </div>
                </div>
                <LanguageSelector language={language} onLanguageChange={(lang) => {
                  setLanguage(lang);
                  // propagate to selected file so Terminal uses correct runner
                  if (selectedFile) {
                    setSelectedFile(prev => prev ? { ...prev, language: lang } : prev);
                    setFiles(prev => prev.map(f => String(f._id) === String(selectedFile._id) ? { ...f, language: lang } : f));
                  }
                }} />
              </div>
              <div className="workspace">
                <FileTree
                  files={files}
                  onSelectFile={handleSelectFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  projectId={selectedProjectId}
                />
                <div className="editor-pane">
                  <CodeEditor language={language} selectedFile={selectedFile} readOnly={currentProjectRole === 'viewer'} />
                </div>
                {/* terminal pane removed */}
              </div>
            </div>
          )} />
        </Routes>
        {showShare && (
          <ShareModal
            apiBase={API}
            projectId={selectedProjectId}
            onClose={() => setShowShare(false)}
            currentRole={currentProjectRole}
          />
        )}
      </div>
    </Router>
  );
}

export default App;