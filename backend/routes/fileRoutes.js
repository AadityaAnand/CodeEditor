const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validate');
const { createFileSchema, updateFileSchema } = require('../validators/file');
const { writeLimiter } = require('../middleware/rateLimiter');

// protect all file routes
router.use(authMiddleware);

router.post('/projects/:projectId/files', validateBody(createFileSchema), fileController.createFile);
router.get('/projects/:projectId/tree', fileController.getProjectTree);
router.get('/projects/:projectId/folders/:folderId', fileController.getFolderContents);
router.get('/files/:fileId', fileController.getFile);
router.get('/files/:fileId/history', fileController.getHistory);
router.put('/files/:fileId', writeLimiter, validateBody(updateFileSchema), fileController.updateFile);
router.delete('/files/:fileId', fileController.deleteFile);
router.post('/files/:fileId/revert', fileController.revertToVersion);

module.exports = router;
