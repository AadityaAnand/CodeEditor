const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const auth = require('../middleware/authMiddleware');

// create a share token for a project (owner only)
router.post('/:projectId', auth, shareController.createShare);

// validate token
router.get('/validate/:token', shareController.validateToken);

// join project with token (authenticated user required)
router.post('/:projectId/join', auth, shareController.joinWithToken);

module.exports = router;
