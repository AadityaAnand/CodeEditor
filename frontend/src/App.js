import CodeEditor from './components/Editor/CodeEditor';
import FileTree from './components/Editor/FileTree';
import LanguageSelector from './components/Editor/LanguageSelector';
import './App.css';
import { useState } from 'react';

function App() {
  const [language, setLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const projectId = '690f4cd7d4cabc914608a3cf'; // Your project ID
  
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

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setLanguage(file.language || 'javascript');
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
setFiles([...files, newFile]);

    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      const savedFile = await response.json();
      console.log('✅ File saved:', savedFile);
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
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolder),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const savedFolder = await response.json();
      console.log('✅ Folder saved:', savedFolder);
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
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
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
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
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
      <header className="header">
        <h1>Collaborative Code Editor</h1>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleCreateFile}
            style={{
              padding: '8px 12px',
              background: '#007ACC',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            + New File
          </button>
          <button 
            onClick={handleCreateFolder}
            style={{
              padding: '8px 12px',
              background: '#007ACC',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            + New Folder
          </button>
        </div>
      </header>
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