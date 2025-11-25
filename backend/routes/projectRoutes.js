const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');
const { validateBody } = require('../middleware/validate');
const { createProjectSchema } = require('../validators/project');

router.use(auth);

// list projects for current user
router.get('/', projectController.getMyProjects);

// create a new project
router.post('/', validateBody(createProjectSchema), projectController.createProject);

// get single project
router.get('/:projectId', projectController.getProject);
router.get('/:projectId/collaborators', projectController.listCollaborators);
router.post('/:projectId/invite', projectController.inviteCollaborator);

module.exports = router;
