const mongoose = require('mongoose');
const { File, Project } = require('../models');

exports.createFile = async (req, res) => {
  try {
    // Allow projectId to be passed either in the URL params or the request body
    const { name, type, parentFolderId, projectId: bodyProjectId, language, content } = req.body;
    const projectIdFromParams = req.params && req.params.projectId;
    const projectId = bodyProjectId || projectIdFromParams;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required in URL params or request body' });
    }

    // Validate projectId as ObjectId
    let projectObjectId;
    try {
      projectObjectId = new mongoose.Types.ObjectId(projectId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }

    const newFile = new File({
      name,
      type,
      parentFolderId: parentFolderId || null,
      projectId: projectObjectId,
      language: type === 'file' ? language : null,
      content: type === 'file' ? content : null,
    });

    await newFile.save();
    // Emit a socket event scoped to the project so connected clients can react
    try {
      if (global.io) {
        const room = String(projectObjectId);
        global.io.to(room).emit('file:created', newFile);
      }
    } catch (e) {
      console.warn('Socket emit failed:', e.message);
    }

    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProjectTree = async (req, res) => {
  try {
    const { projectId } = req.params;
    const objectId = new mongoose.Types.ObjectId(projectId);
    const files = await File.find({ projectId: objectId }).sort({ name: 1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFolderContents = async (req, res) => {
  try {
    const { projectId, folderId } = req.params;
    const objectId = new mongoose.Types.ObjectId(projectId);
    const parentId = folderId === 'root' ? null : new mongoose.Types.ObjectId(folderId);

    const files = await File.find({
      projectId: objectId,
      parentFolderId: parentId,
    }).sort({ type: -1, name: 1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(new mongoose.Types.ObjectId(fileId));

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name, parentFolderId, content, language } = req.body;

    const file = await File.findByIdAndUpdate(
      new mongoose.Types.ObjectId(fileId),
      {
        name: name !== undefined ? name : undefined,
        parentFolderId: parentFolderId !== undefined ? new mongoose.Types.ObjectId(parentFolderId) : undefined,
        content: content !== undefined ? content : undefined,
        language: language !== undefined ? language : undefined,
      },
      { new: true }
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // notify clients in the file's project room that a file was updated
    try {
      if (global.io) {
        const room = String(file.projectId);
        global.io.to(room).emit('file:updated', file);
      }
    } catch (e) {
      console.warn('Socket emit failed:', e.message);
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(new mongoose.Types.ObjectId(fileId));

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.type === 'folder') {
      await File.deleteMany({ parentFolderId: new mongoose.Types.ObjectId(fileId) });
    }

    await File.findByIdAndDelete(new mongoose.Types.ObjectId(fileId));

    // notify clients in the file's project room that a file was deleted
    try {
      if (global.io) {
        const room = String(file.projectId);
        global.io.to(room).emit('file:deleted', { fileId });
      }
    } catch (e) {
      console.warn('Socket emit failed:', e.message);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};