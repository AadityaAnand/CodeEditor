const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

// protect all file routes
router.use(authMiddleware);

router.post('/projects/:projectId/files', fileController.createFile);
router.get('/projects/:projectId/tree', fileController.getProjectTree);
router.get('/projects/:projectId/folders/:folderId', fileController.getFolderContents);
router.get('/files/:fileId', fileController.getFile);
router.put('/files/:fileId', fileController.updateFile);
router.delete('/files/:fileId', fileController.deleteFile);

module.exports = router;
