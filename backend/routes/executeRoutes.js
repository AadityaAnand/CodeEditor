const express = require('express');
const router = express.Router();
const { executeCode, pythonHealth } = require('../controllers/executeController');
const auth = require('../middleware/authMiddleware');

// Health route: unprotected to allow environment checks
router.get('/health', pythonHealth);
router.post('/', auth, executeCode);

module.exports = router;
