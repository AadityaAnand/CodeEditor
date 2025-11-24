const rateLimit = require('express-rate-limit');

// limit login/register to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// limit write operations (file updates) to reasonable rate
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // higher for collaborative edits via HTTP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, slow down.' },
});

module.exports = { authLimiter, writeLimiter };
