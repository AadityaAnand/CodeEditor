const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';

module.exports = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Unauthorized' });

    // attach user info (id + email)
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
