require('dotenv').config();
const mongoose = require('mongoose');
const { File, Project } = require('./models');

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test project
    const projectId = new mongoose.Types.ObjectId();
    
    // Create test files
    const file1 = new File({
      name: 'App.js',
      type: 'file',
      projectId,
      parentFolderId: null,
      language: 'javascript',
      content: "console.log('Hello from App.js');",
    });

    const folder1 = new File({
      name: 'src',
      type: 'folder',
      projectId,
      parentFolderId: null,
    });

    const file2 = new File({
      name: 'index.js',
      type: 'file',
      projectId,
      parentFolderId: folder1._id,
      language: 'javascript',
      content: "// Index file",
    });

    await file1.save();
    await folder1.save();
    await file2.save();

    console.log('✅ Test data created!');
    console.log('Project ID:', projectId);
    console.log('Use this projectId in App.js');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestData();