const express = require('express');
const router = express.Router();
const { executeCode } = require('../controllers/executeController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, executeCode);

module.exports = router;
