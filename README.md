# CodeEditor — Collaborative Real-Time Code Editor

A full-stack collaborative code editor with real-time synchronization, presence awareness, and version history.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)

## 🚀 Features

- **Real-time Collaboration**: Multiple users edit simultaneously with live cursor tracking
- **Authentication & Authorization**: JWT-based auth with role-based access control (owner/editor/viewer)
- **Project & File Management**: Create projects, organize files in folders, manage collaborators
- **Version History**: Auto-saves versions on every edit; revert to any previous state
- **Share Links**: Generate time-limited share tokens to invite collaborators
- **Presence Awareness**: See who's online and editing in real-time
- **Monaco Editor Integration**: Syntax highlighting for Python, JavaScript, TypeScript, Java, C, C++
- **Code Syntax Support**: Edit and highlight code in multiple languages

## 🏗️ Tech Stack

**Backend**:
- Node.js + Express
- MongoDB (Mongoose ODM)
- Socket.io (real-time sync)
- JWT authentication
- Pino logging

**Frontend**:
- React 18
- Monaco Editor (@monaco-editor/react)
- Socket.io-client
- CSS Grid responsive design

**DevOps**:
- Docker & docker-compose
- GitHub Actions (CI/CD)
- Render (backend deployment)
- Vercel (frontend deployment)
- MongoDB Atlas (cloud database)

## 📋 Prerequisites & Quick Start

**Requirements**: Node.js >= 18.x, MongoDB (local or Atlas)

### 1. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# Create backend/.env with these required variables:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/codeeditor
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

### 3. Run Locally
```bash
# Terminal 1: Backend (runs on port 5050)
cd backend
npm run dev

# Terminal 2: Frontend (runs on port 3000)
cd frontend
npm start
```

### 4. Docker (Full Stack)
```bash
docker-compose up --build
```

## 🌐 Deployment

### Backend Deployment (Render)

1. **Prepare environment variables**:
   - Go to Render dashboard → Service settings → Environment
   - Add these variables:
     ```
     MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/codeeditor
     JWT_SECRET=your-strong-secret-key
     NODE_ENV=production
     CLIENT_ORIGIN=https://your-frontend-url.vercel.app
     ```

2. **Deploy**:
   - Connect your GitHub repo to Render
   - Create a new Web Service
   - Set build command: `cd backend && npm install`
   - Set start command: `node server.js`
   - Render auto-deploys on push to main

3. **Verify health**:
   ```bash
   curl https://your-backend.onrender.com/health
   curl https://your-backend.onrender.com/ready
   ```

### Frontend Deployment (Vercel)

1. **Set environment variables**:
   - Vercel dashboard → Settings → Environment Variables
   - Add:
     ```
     REACT_APP_API_URL=https://your-backend.onrender.com
     ```

2. **Deploy**:
   - Connect your GitHub repo to Vercel
   - Select `frontend` directory as root
   - Vercel auto-deploys on push to main

### Database Setup (MongoDB Atlas)

1. Create a cluster on MongoDB Atlas
2. Create a user with read/write permissions
3. Whitelist your IP (or use 0.0.0.0/0 for any)
4. Copy the connection string and add to Render env vars

## 📄 License

MIT
