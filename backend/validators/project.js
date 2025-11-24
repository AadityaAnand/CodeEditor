const Joi = require('joi');

const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').max(2000).optional(),
});

module.exports = { createProjectSchema };
