const { File, Project } = require('../models');
exports.createFile = async (req, res) => {
  try {
    const { name, type, parentFolderId, projectId, language, content } = req.body;

    const newFile = new File({
      name,
      type,
      parentFolderId: parentFolderId || null,
      projectId,
      language: type === 'file' ? language : null,
      content: type === 'file' ? content : null,
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getProjectTree = async (req, res) => {
  try {
    const { projectId } = req.params;

    const files = await File.find({ projectId }).sort({ name: 1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getFolderContents = async (req, res) => {
  try {
    const { projectId, folderId } = req.params;
    const parentId = folderId === 'root' ? null : folderId;

    const files = await File.find({
      projectId,
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

    const file = await File.findById(fileId);

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
      fileId,
      {
        name: name !== undefined ? name : undefined,
        parentFolderId: parentFolderId !== undefined ? parentFolderId : undefined,
        content: content !== undefined ? content : undefined,
        language: language !== undefined ? language : undefined,
      },
      { new: true }
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    if (file.type === 'folder') {
      await File.deleteMany({ parentFolderId: fileId });
    }

    await File.findByIdAndDelete(fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};