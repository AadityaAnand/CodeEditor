const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
