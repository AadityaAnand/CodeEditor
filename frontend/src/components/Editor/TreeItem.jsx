import React, { useState } from 'react';
import './TreeItem.css';

function TreeItem({ item, onSelectFile, allFiles, onDeleteFile, onRenameFile }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const children = allFiles.filter(
    (file) => file.parentFolderId === item._id
  );

  const isFolder = item.type === 'folder';
  const hasChildren = children.length > 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelectFile = () => {
    if (!isFolder) {
      onSelectFile(item);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${item.name}?`)) {
      onDeleteFile(item._id);
    }
    setShowMenu(false);
  };

  const handleRename = () => {
    onRenameFile(item._id);
    setShowMenu(false);
  };

  return (
    <div className="tree-item">
      <div 
        className="tree-item-label"
        onContextMenu={handleRightClick}
      >
        {isFolder && (
          <span 
            className="toggle-icon"
            onClick={handleToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!isFolder && <span className="file-icon">📄</span>}
        {isFolder && <span className="folder-icon">📁</span>}

        <span 
          className={`item-name ${!isFolder ? 'file-name' : ''}`}
          onClick={handleSelectFile}
        >
          {item.name}
        </span>
      </div>
      {showMenu && (
        <div className="context-menu">
          <button onClick={handleRename}>Rename</button>
          <button onClick={handleDelete}>Delete</button>
          <button onClick={() => setShowMenu(false)}>Cancel</button>
        </div>
      )}
      {isFolder && isExpanded && hasChildren && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeItem
              key={child._id}
              item={child}
              onSelectFile={onSelectFile}
              allFiles={allFiles}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TreeItem;