import React, { useEffect } from 'react';
import TreeItem from './TreeItem';
import './FileTree.css';

function FileTree({ files, onSelectFile, onDeleteFile, onRenameFile, projectId }) {
  // keep a simple loading flag for future use; avoid unused setter lint warnings
  const loading = false;

  useEffect(() => {
    // placeholder effect in case projectId changes we may fetch folder contents later
  }, [projectId]);

  const rootItems = files.filter((file) => file.parentFolderId === null);

  return (
    <div className="file-tree">
      <h3>Files</h3>
      
      {loading && <p style={{ color: '#999' }}>Loading...</p>}
      
      {!loading && rootItems.length === 0 && (
        <p style={{ color: '#999' }}>No files yet</p>
      )}

      {!loading && rootItems.map((item) => (
        <TreeItem
          key={item._id}
          item={item}
          onSelectFile={onSelectFile}
          allFiles={files}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
        />
      ))}
    </div>
  );
}

export default FileTree;