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

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.log('❌ MongoDB connection error:', err));

const fileRoutes = require('./routes/fileRoutes');
console.log('✅ File routes loaded');
const authRoutes = require('./routes/authRoutes');

// create HTTP server and attach socket.io so we can emit events from controllers
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('🔌 socket connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 socket disconnected:', socket.id));

  // join a project room so events can be scoped to a project
  socket.on('join-project', (projectId) => {
    try {
      if (projectId) {
        socket.join(projectId);
        console.log(`🔌 socket ${socket.id} joined project ${projectId}`);
      }
    } catch (e) {
      console.warn('join-project handler error:', e.message);
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

app.use('/api', fileRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// export app/server for tests
module.exports = { app, server };