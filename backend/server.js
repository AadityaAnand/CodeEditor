require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Project, File } = require('./models');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // allow common headers used by browsers and fetch requests
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
};

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
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.log('❌ MongoDB connection error:', err));

const fileRoutes = require('./routes/fileRoutes');
console.log('✅ File routes loaded');
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

// in-memory presence tracking: fileId -> Map(socketId -> { userId, name, cursor })
const presenceMap = new Map();

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
  console.log('🔌 socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 socket disconnected:', socket.id);
    // remove socket from any presence lists it was part of
    try {
      for (const [fileId, map] of presenceMap.entries()) {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          // cleanup empty maps
          if (map.size === 0) presenceMap.delete(fileId);
          emitPresenceUpdate(fileId);
        }
      }
    } catch (e) {
      console.warn('disconnect presence cleanup error:', e.message);
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
        console.log(`🔌 socket ${socket.id} joined project ${projectId}`);
      } else {
        console.warn(`🔒 socket ${socket.id} attempted to join project ${projectId} without access`);
      }
    } catch (e) {
      console.warn('join-project handler error:', e.message);
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

      // broadcast updated file to the project room (don't echo back to sender)
      const room = String(file.projectId);
      try {
        socket.to(room).emit('file:updated', file);
      } catch (e) {
        // fallback
        io.to(room).emit('file:updated', file);
      }
    } catch (e) {
      console.warn('file:edit handler error:', e.message);
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
      console.warn('presence:join error:', e.message);
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
      console.warn('presence:leave error:', e.message);
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
      console.warn('presence:cursor error:', e.message);
    }
  });
});

// expose io for controllers (lightweight approach)
global.io = io;

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
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

// default to 5050 locally to avoid clashes with OS services
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// export app/server for tests
module.exports = { app, server };