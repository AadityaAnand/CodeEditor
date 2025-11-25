require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { User, Project, File } = require('./models');
const Version = require('./models/Version');

const app = express();
const logger = require('./logger');
const pinoHttp = require('pino-http');
const Sentry = require('@sentry/node');

// Initialize Sentry if configured (production only recommended)
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({ 
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // sample 10% of transactions for performance monitoring
  });
  // request handler must be first middleware when using Sentry
  app.use(Sentry.Handlers.requestHandler());
  logger.info('✅ Sentry initialized for production error tracking');
}

// Request ID middleware (for tracing)
const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

// attach pino-http for request logging (will include req.id from requestId middleware)
app.use(pinoHttp({ 
  logger,
  customProps: (req) => ({ requestId: req.id }),
}));
const http = require('http');
const { Server } = require('socket.io');

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // allow common headers used by browsers and fetch requests
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
};

// enable security headers
app.use(helmet());

// enable CORS using the configured options and make sure preflight requests are handled
app.use(cors(corsOptions));
// Some environments or older middleware can cause wildcard OPTION handlers
// (e.g. `app.options('*', ...)`) to throw path parsing errors. To ensure a
// reliable preflight response without relying on a wildcard route, add a
// small middleware that returns the proper CORS headers for OPTIONS requests.
// This avoids path-to-regexp issues while keeping preflight handling explicit.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // set CORS headers using our corsOptions values
    const origin = Array.isArray(corsOptions.origin) ? corsOptions.origin[0] : corsOptions.origin;
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    if (corsOptions.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    // respond with 204 No Content for preflight
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
.then(() => logger.info('✅ MongoDB connected'))
.catch((err) => logger.error({ err }, '❌ MongoDB connection error'));

const fileRoutes = require('./routes/fileRoutes');
logger.info('✅ File routes loaded');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const shareRoutes = require('./routes/shareRoutes');
const socketAuth = require('./middleware/socketAuth');

// create HTTP server and attach socket.io so we can emit events from controllers
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// in-memory presence tracking (file-level): fileId -> Map(socketId -> { userId, name, cursor })
const presenceMap = new Map();
// in-memory project presence: projectId -> Map(socketId -> { userId, name, role })
const projectPresence = new Map();

function emitProjectPresence(projectId) {
  const map = projectPresence.get(String(projectId));
  const list = [];
  if (map) {
    for (const [, info] of map.entries()) list.push(info);
  }
  try { io.to(String(projectId)).emit('project:presence', list); } catch (e) { console.warn('emitProjectPresence failed:', e.message); }
}

function emitPresenceUpdate(fileId) {
  const map = presenceMap.get(fileId);
  const users = [];
  if (map) {
    for (const [, info] of map.entries()) {
      users.push(info);
    }
  }
  try {
    io.to(`presence:${fileId}`).emit('presence:update', users);
  } catch (e) {
    console.warn('emitPresenceUpdate failed:', e.message);
  }
}

// attach socket auth middleware so sockets are authenticated via JWT
io.use((socket, next) => socketAuth(socket, next));

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, '🔌 socket connected');
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, '🔌 socket disconnected');
    // file-level cleanup
    try {
      for (const [fileId, map] of presenceMap.entries()) {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          if (map.size === 0) presenceMap.delete(fileId);
          emitPresenceUpdate(fileId);
        }
      }
    } catch (e) {
      console.warn('disconnect presence cleanup error:', e.message);
    }
    // project-level cleanup
    try {
      for (const [projId, map] of projectPresence.entries()) {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          if (map.size === 0) projectPresence.delete(projId);
          emitProjectPresence(projId);
        }
      }
    } catch (e) {
      console.warn('disconnect project presence cleanup error:', e.message);
    }
  });

  // join a project room so events can be scoped to a project
  socket.on('join-project', async (projectId) => {
    try {
  if (!projectId) return;
      const project = await Project.findById(projectId);
      if (!project) return console.warn('join-project: project not found', projectId);

      const userId = socket.user && socket.user.id;
      const isOwner = String(project.owner) === String(userId);
      const isCollaborator = project.collaborators && project.collaborators.some((c) => String(c.userId) === String(userId));

      if (isOwner || isCollaborator) {
        socket.join(projectId);
        // track presence with role
        try {
          let map = projectPresence.get(String(projectId));
          if (!map) { map = new Map(); projectPresence.set(String(projectId), map); }
          const role = isOwner ? 'owner' : (project.collaborators.find(c => String(c.userId) === String(userId))?.role || 'editor');
          map.set(socket.id, { socketId: socket.id, userId, name: socket.user && (socket.user.name || socket.user.email), role });
          emitProjectPresence(projectId);
        } catch (e) { console.warn('project presence set failed', e.message); }
        logger.info({ socketId: socket.id, projectId }, `🔌 socket ${socket.id} joined project ${projectId}`);
      } else {
  logger.warn({ socketId: socket.id, projectId }, `🔒 socket attempted to join project without access`);
      }
      } catch (e) {
      logger.warn({ err: e }, 'join-project handler error');
    }
  });

  // receive live edits from clients and broadcast to project room
  socket.on('file:edit', async ({ fileId, content }) => {
    try {
      if (!fileId) return;
      const file = await File.findById(fileId);
      if (!file) return;

      // check access: owner or collaborator
      const project = await Project.findById(file.projectId);
      if (!project) return;
      const userId = socket.user && socket.user.id;
      const isOwner = String(project.owner) === String(userId);
      const isCollaborator = project.collaborators && project.collaborators.some((c) => String(c.userId) === String(userId));
      if (!isOwner && !isCollaborator) return;

      // update the file content (authoritative save)
      file.content = content;
      await file.save();

      // create a version snapshot (best-effort)
      try {
        await Version.create({ fileId: file._id, projectId: file.projectId, content: file.content, language: file.language, userId: socket.user && socket.user.id });
      } catch (e) {
        console.warn('create version failed:', e.message);
      }

      // broadcast updated file to the project room (don't echo back to sender)
      const room = String(file.projectId);
      try {
        socket.to(room).emit('file:updated', file);
      } catch (e) {
        // fallback
        io.to(room).emit('file:updated', file);
      }
    } catch (e) {
      logger.warn({ err: e }, 'file:edit handler error');
    }
  });

  // presence: join/leave a file-level presence group
  socket.on('presence:join', ({ fileId, user, cursor }) => {
    try {
      if (!fileId || !user) return;
      // add to presence map
      let map = presenceMap.get(fileId);
      if (!map) {
        map = new Map();
        presenceMap.set(fileId, map);
      }
      map.set(socket.id, { socketId: socket.id, userId: user.id, name: user.name || user.email || 'Anonymous', cursor: cursor || null });
      // join a presence-specific room so clients can subscribe easily
      socket.join(`presence:${fileId}`);
      emitPresenceUpdate(fileId);
    } catch (e) {
      logger.warn({ err: e }, 'presence:join error');
    }
  });

  socket.on('presence:leave', ({ fileId }) => {
    try {
      if (!fileId) return;
      const map = presenceMap.get(fileId);
      if (map && map.has(socket.id)) {
        map.delete(socket.id);
        if (map.size === 0) presenceMap.delete(fileId);
        socket.leave(`presence:${fileId}`);
        emitPresenceUpdate(fileId);
      }
    } catch (e) {
      logger.warn({ err: e }, 'presence:leave error');
    }
  });

  // update cursor position for a user on a file and broadcast presence
  socket.on('presence:cursor', ({ fileId, cursor }) => {
    try {
      if (!fileId) return;
      const map = presenceMap.get(fileId);
      if (!map) return;
      const entry = map.get(socket.id);
      if (!entry) return;
      entry.cursor = cursor || null;
      map.set(socket.id, entry);
      emitPresenceUpdate(fileId);
    } catch (e) {
      logger.warn({ err: e }, 'presence:cursor error');
    }
  });
});

// expose io for controllers (lightweight approach)
global.io = io;

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// health and readiness endpoints
app.get('/health', (req, res) => {
  // basic liveness probe
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', (req, res) => {
  // readiness: ensure MongoDB is connected
  const readyStates = [1]; // mongoose.ConnectionStates.connected === 1
  const state = mongoose.connection.readyState;
  if (readyStates.includes(state)) {
    return res.status(200).json({ ready: true });
  }
  return res.status(503).json({ ready: false, state });
});

// authentication routes
app.use('/auth', authRoutes);

app.get('/api/debug/files', async (req, res) => {
  try {
    const files = await File.find({}).limit(10);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// project routes (protected inside)
app.use('/api/projects', projectRoutes);

// share routes
app.use('/api/share', shareRoutes);

// file routes (under /api/...)
app.use('/api', fileRoutes);

// Sentry error handler (must be after all controllers and before other error middleware)
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}

// Generic error handler
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId: req.id,
  });
});

// Start server only when this file is run directly (prevents tests from trying to listen multiple times)
// default to 5050 locally to avoid clashes with OS services
const PORT = process.env.PORT || 5050;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// export app/server for tests
module.exports = { app, server };

// Graceful shutdown handling so the process can terminate cleanly
async function gracefulShutdown(signal) {
  try {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    // stop accepting new connections
    if (server && server.close) {
      await new Promise((resolve) => server.close(() => resolve()));
      console.log('HTTP server closed');
    }

    // close socket.io
    try {
      if (global.io && global.io.close) {
        await global.io.close();
        console.log('Socket.io closed');
      }
    } catch (e) {
      console.warn('Error closing socket.io:', e && e.message);
    }

    // disconnect mongoose
    try {
      await mongoose.disconnect();
      console.log('Mongoose disconnected');
    } catch (e) {
      console.warn('Error disconnecting mongoose:', e && e.message);
    }

    console.log('Shutdown complete. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('Graceful shutdown failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection, shutting down:', reason);
  gracefulShutdown('unhandledRejection');
});