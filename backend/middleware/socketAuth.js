const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';

module.exports = (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return next(new Error('Authentication error'));
    // attach user info onto socket
    socket.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
};
