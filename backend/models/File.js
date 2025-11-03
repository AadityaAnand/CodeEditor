const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['file', 'folder'],
      required: true,
    },
    content: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: 'javascript',
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
fileSchema.index({ projectId: 1, parentFolderId: 1 });

const File = mongoose.model('File', fileSchema);

module.exports = File;