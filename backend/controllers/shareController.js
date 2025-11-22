const ShareToken = require('../models/ShareToken');
const Project = require('../models/Project');

exports.createShare = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role = 'editor', ttlHours = 24 } = req.body;
    // only owner can create share tokens
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (String(project.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Forbidden' });

    const tokenDoc = await ShareToken.generate(projectId, role, ttlHours);
    res.status(201).json({ token: tokenDoc.token, expiresAt: tokenDoc.expiresAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    const doc = await ShareToken.findOne({ token });
    if (!doc) return res.status(404).json({ error: 'Invalid token' });
    if (doc.expiresAt && doc.expiresAt < new Date()) return res.status(410).json({ error: 'Token expired' });
    res.json({ projectId: doc.projectId, role: doc.role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.joinWithToken = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const doc = await ShareToken.findOne({ token, projectId });
    if (!doc) return res.status(404).json({ error: 'Invalid token' });
    if (doc.expiresAt && doc.expiresAt < new Date()) return res.status(410).json({ error: 'Token expired' });

    // add user as collaborator
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // if already collaborator, return
    if (project.collaborators && project.collaborators.some((c) => String(c.userId) === String(userId))) {
      return res.json({ message: 'Already a collaborator' });
    }

    project.collaborators = project.collaborators || [];
    project.collaborators.push({ userId, role: doc.role || 'editor' });
    await project.save();
    res.json({ message: 'Joined project', projectId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
