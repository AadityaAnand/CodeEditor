import React, { useState, useEffect } from 'react';
import TreeItem from './TreeItem';
import './FileTree.css';

function FileTree({ files, onSelectFile, onDeleteFile, onRenameFile, projectId }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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