const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');

router.use(auth);

// list projects for current user
router.get('/', projectController.getMyProjects);

// create a new project
router.post('/', projectController.createProject);

// get single project
router.get('/:projectId', projectController.getProject);

module.exports = router;
