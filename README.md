# Collaborative Code Editor

Local development notes and quick start

Requirements
- Node.js 18+ and npm
- MongoDB running locally or a MongoDB connection URI

Environment
- Backend reads env vars from `.env` (optional):
  - MONGODB_URI (default: mongodb://localhost:27017/collaborative-editor)
  - PORT (default: 5050)
  - JWT_SECRET (default: change in production)

Start backend
```bash
cd backend
npm install
PORT=5050 MONGODB_URI="mongodb://localhost:27017/collaborative-editor" npm start
```

Start frontend
```bash
cd frontend
npm install
npm start
```

Features implemented
- JWT auth (register/login)
- Projects with owner/collaborators
- File CRUD (protected to project members)
- Real-time sync via socket.io (debounced client edits)
- Presence (who's viewing) and cursor sync with colored carets and name badges
- Shareable project links (token-based invites)
- File versioning/history with revert support

Notes
- Presence and versioning are in-memory / basic persistence respectively. For production scale, move presence to Redis and add CRDT-based merging (Yjs) for robust concurrent edits.
# CodeEditor