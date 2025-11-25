# CodeEditor — Collaborative Real-Time Code Editor

A full-stack collaborative code editor with real-time synchronization, presence awareness, and version history. Built for resume/demo purposes with production-ready features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit the same file simultaneously with live cursor tracking
- **Authentication & Authorization**: JWT-based auth with role-based access control (owner/collaborator)
- **Project & File Management**: Create projects, organize files in folders, and manage collaborators
- **Version History**: Auto-saves versions on every edit; revert to any previous state
- **Share Links**: Generate time-limited share tokens to invite collaborators
- **Presence Awareness**: See who's online and what they're editing
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting and IntelliSense
- **Production-Ready**: Structured logging (pino), error tracking (Sentry), health checks, graceful shutdown
- **CI/CD**: Automated tests, smoke tests, pre-deploy verification via GitHub Actions
- **Containerized**: Docker & docker-compose for local dev and deployment

## 🏗️ Tech Stack

**Backend**: Node.js + Express 5, MongoDB (Mongoose), Socket.io, JWT, Pino logging, Sentry, Jest + Supertest  
**Frontend**: React 18 (CRA), Monaco Editor, Socket.io-client, CSS (custom responsive design)  
**DevOps**: Docker + docker-compose, GitHub Actions, Render/Railway (backend), Vercel (frontend), MongoDB Atlas

## 📋 Prerequisites & Quick Start

**Requirements**: Node.js >= 18.x, MongoDB (local or Atlas), Docker (optional)

### 1. Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# Copy example and edit with your values
cp env.example backend/.env
# Required: MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN
# Optional: SENTRY_DSN, REDIS_URL, LOG_LEVEL
```

### 3. Run Locally
```bash
# Backend (port 5050)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm start
```

### 4. Run Tests
```bash
# Backend integration tests
cd backend && npm test

# Smoke test (requires backend running)
BACKEND_URL=http://localhost:5050 node scripts/smoke.js
```

### 5. Docker (Full Stack)
```bash
docker-compose up --build
# Services: mongo:27017, redis:6379, backend:5050, frontend:3000
```

## 📚 API Endpoints

**Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`  
**Projects**: `POST /api/projects`, `GET /api/projects`, `GET /api/projects/:id`, `POST /api/projects/:id/collaborators`  
**Files**: `POST /api/projects/:projectId/files`, `GET /api/files/:id`, `PUT /api/files/:id`, `GET /api/files/:id/history`, `POST /api/files/:id/revert`  
**Share**: `POST /api/share/:projectId`, `GET /api/share/validate/:token`, `POST /api/share/:projectId/join`  
**Health**: `GET /health`, `GET /ready`

## 🔌 Socket.io Events

**Client → Server**: `join-project`, `file:edit`, `presence:update`  
**Server → Client**: `file:update`, `presence:join`, `presence:leave`, `presence:update`

## 📦 Deployment

See [DEPLOY.md](./DEPLOY.md) for full deploy guide. Quick steps:
1. Provision MongoDB Atlas ([PROVISIONING.md](./PROVISIONING.md))
2. Set secrets in GitHub/Render/Vercel ([SECRETS.md](./SECRETS.md))
3. Deploy backend to Render/Railway, frontend to Vercel
4. Run smoke test: `BACKEND_URL=https://your-backend.onrender.com node scripts/smoke.js`

## 🧪 Testing & CI

- **CI**: GitHub Actions runs tests + builds + smoke tests on push/PR
- **Backend tests**: Jest + Supertest with mongodb-memory-server
- **Smoke tests**: End-to-end flow validation (register → login → create project/file)

## 🐛 Troubleshooting

**Backend won't start**: Verify `MONGODB_URI` and ensure MongoDB is accessible  
**Socket.io fails**: Check `CLIENT_ORIGIN` matches frontend URL and CORS settings  
**Tests fail**: Run with `npm test -- --runInBand` to avoid port conflicts

## 📄 Documentation

- [PROVISIONING.md](./PROVISIONING.md) — MongoDB Atlas setup
- [SECRETS.md](./SECRETS.md) — Environment secrets reference
- [DEPLOY.md](./DEPLOY.md) — Deployment guide for Render + Vercel

## 📞 Contact

GitHub: [@AadityaAnand](https://github.com/AadityaAnand) • Repo: [CodeEditor](https://github.com/AadityaAnand/CodeEditor)

---
**Built with ❤️ for collaborative coding**

# CodeEditor