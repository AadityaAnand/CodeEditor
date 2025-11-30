const Project = require('../models/Project');

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const project = new Project({ name, description: description || '', owner: req.user.id });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'collaborators.userId': userId },
      ],
    }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// invite collaborator by email with role (owner only)
exports.inviteCollaborator = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email and role required' });
    if (!['viewer','editor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (String(project.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Only owner can invite collaborators' });
    const User = require('../models/User');
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // if already collaborator update role; if owner cannot change
    if (String(project.owner) === String(user._id)) return res.status(400).json({ error: 'Owner already has full access' });
    const existingIdx = project.collaborators.findIndex(c => String(c.userId) === String(user._id));
    if (existingIdx >= 0) {
      project.collaborators[existingIdx].role = role;
    } else {
      project.collaborators.push({ userId: user._id, role });
    }
    await project.save();
    res.status(200).json({ message: 'Collaborator invited', collaborator: { userId: user._id, email: user.email, role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// list collaborators (owner or collaborator access)
exports.listCollaborators = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('collaborators.userId','email name');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const requesterId = req.user.id;
    const isOwner = String(project.owner) === String(requesterId);
    const isCollab = project.collaborators.some(c => {
      // after populate userId is a document; before populate it's an ObjectId
      if (!c.userId) return false;
      const id = c.userId._id ? c.userId._id : c.userId; // support both forms
      return String(id) === String(requesterId);
    });
    if (!isOwner && !isCollab) return res.status(403).json({ error: 'Forbidden' });
    const ownerUser = await require('../models/User').findById(project.owner).select('email name');
    const list = [ { userId: ownerUser._id, email: ownerUser.email, name: ownerUser.name, role: 'owner' }, ...project.collaborators.map(c => ({ userId: c.userId._id, email: c.userId.email, name: c.userId.name, role: c.role })) ];
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
