const mongoose = require('mongoose');
const { File, Project } = require('../models');
const Version = require('../models/Version');

async function userRoleForProject(projectId, userId) {
  if (!userId) return null;
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (String(project.owner) === String(userId)) return 'owner';
  const collab = project.collaborators && project.collaborators.find((c) => String(c.userId) === String(userId));
  return collab ? collab.role : null;
}

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

    // ensure the requester has access to this project
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(projectObjectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'viewer') return res.status(403).json({ error: 'Read-only access' });

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
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(objectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
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
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(objectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
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

    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(file.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });

    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name, parentFolderId, content, language } = req.body;

    const fileObjId = new mongoose.Types.ObjectId(fileId);
    const existing = await File.findById(fileObjId);
    if (!existing) return res.status(404).json({ error: 'File not found' });

    // ensure access before updating
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(existing.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'viewer') return res.status(403).json({ error: 'Read-only access' });

    // create a version snapshot of the previous content
    try {
      await Version.create({ fileId: fileObjId, projectId: existing.projectId, content: existing.content, language: existing.language, userId: req.user.id });
    } catch (e) {
      console.warn('create version failed', e.message);
    }

    // apply updates
    existing.name = name !== undefined ? name : existing.name;
    existing.parentFolderId = parentFolderId !== undefined ? (parentFolderId ? new mongoose.Types.ObjectId(parentFolderId) : null) : existing.parentFolderId;
    existing.content = content !== undefined ? content : existing.content;
    existing.language = language !== undefined ? language : existing.language;
    await existing.save();
    const file = existing;

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

exports.getHistory = async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileObjId = new mongoose.Types.ObjectId(fileId);
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const file = await File.findById(fileObjId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const role = await userRoleForProject(file.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });

    // populate user details for each version so UI can show who made the edit
    const versions = await Version.find({ fileId: fileObjId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name email');
    res.json(versions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.revertToVersion = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { versionId } = req.body;
    if (!versionId) return res.status(400).json({ error: 'versionId required' });
    const fileObjId = new mongoose.Types.ObjectId(fileId);
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const file = await File.findById(fileObjId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const role = await userRoleForProject(file.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'viewer') return res.status(403).json({ error: 'Read-only access' });

    const version = await Version.findById(new mongoose.Types.ObjectId(versionId));
    if (!version) return res.status(404).json({ error: 'Version not found' });

    // create snapshot of current before revert
    try { await Version.create({ fileId: fileObjId, projectId: file.projectId, content: file.content, language: file.language, userId: req.user.id }); } catch (e) {}

    file.content = version.content;
    file.language = version.language || file.language;
    await file.save();

    // broadcast update
    try { if (global.io) global.io.to(String(file.projectId)).emit('file:updated', file); } catch (e) {}

    res.json({ message: 'Reverted', file });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(new mongoose.Types.ObjectId(fileId));

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
    const role = await userRoleForProject(file.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'viewer') return res.status(403).json({ error: 'Read-only access' });

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