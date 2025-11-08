const express = require('express');
const cors = require('cors');
const router = express.Router();
const fileController = require('../controllers/fileController');
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
router.use(cors(corsOptions));
router.post('/projects/:projectId/files', fileController.createFile);
router.get('/projects/:projectId/tree', fileController.getProjectTree);
router.get('/projects/:projectId/folders/:folderId', fileController.getFolderContents);
router.get('/files/:fileId', fileController.getFile);
router.put('/files/:fileId', fileController.updateFile);
router.delete('/files/:fileId', fileController.deleteFile);
module.exports = router;
