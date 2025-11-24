const Joi = require('joi');

const createFileSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('file', 'folder').required(),
  parentFolderId: Joi.string().optional().allow(null),
  language: Joi.string().optional().allow(null, ''),
  content: Joi.any().optional().allow(null, ''),
  // projectId may be passed in body or URL
  projectId: Joi.string().optional().allow(null),
});

const updateFileSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  parentFolderId: Joi.string().optional().allow(null),
  content: Joi.any().optional().allow(null, ''),
  language: Joi.string().optional().allow(null, ''),
});

module.exports = { createFileSchema, updateFileSchema };
