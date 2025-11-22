const mongoose = require('mongoose');
const crypto = require('crypto');

const shareTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  role: { type: String, enum: ['viewer', 'editor'], default: 'editor' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

shareTokenSchema.statics.generate = async function (projectId, role = 'editor', ttlHours = 24) {
  const token = crypto.randomBytes(12).toString('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  const doc = new this({ token, projectId, role, expiresAt });
  await doc.save();
  return doc;
};

const ShareToken = mongoose.model('ShareToken', shareTokenSchema);
module.exports = ShareToken;
