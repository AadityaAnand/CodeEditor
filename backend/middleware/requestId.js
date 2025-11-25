const { randomUUID } = require('crypto');

/**
 * Request ID middleware
 * Generates or accepts X-Request-Id header and attaches it to req.id and res headers
 * This ID can be used for request tracing across logs and socket events
 */
module.exports = (req, res, next) => {
  // Use existing request ID from header or generate a new one
  const requestId = req.headers['x-request-id'] || randomUUID();
  
  // Attach to request object for use in handlers
  req.id = requestId;
  
  // Set response header so client can correlate logs
  res.setHeader('X-Request-Id', requestId);
  
  next();
};
