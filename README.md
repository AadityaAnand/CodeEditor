# Collaborative Code Editor

Local development notes and quick start

Requirements
- Node.js 18+ and npm
- MongoDB running locally or a MongoDB connection URI (for production/staging). Tests use an in-memory MongoDB.

Quick start (macOS / zsh)

1) Install dependencies

```bash
# at repo root
npm install
# frontend deps
cd frontend && npm install && cd ..
# backend deps
cd backend && npm install && cd ..
```

2) Copy example env and set values for your environment

```bash
# from repo root
cp env.example backend/.env
# edit backend/.env and fill JWT_SECRET, MONGODB_URI, etc.
```

3) Start backend (development)

```bash
cd backend
# recommended: use nodemon or the provided dev script
npm run dev
```

By default the backend listens on PORT=5050 (unless overridden in your .env).

4) Start frontend (development)

```bash
cd frontend
npm start
```

5) Run backend tests (uses in-memory MongoDB so no external DB required)

```bash
cd backend
npm test -- --runInBand
```

Environment (example)
- See `env.example` at the repository root. Typical variables:
  - JWT_SECRET - secret used to sign JWT tokens
  - MONGODB_URI - MongoDB connection string
  - CLIENT_ORIGIN - allowed frontend origin (e.g. http://localhost:3000)
  - PORT - backend port (default 5050)
  - REDIS_URL - optional (for presence adapter)
  - SMTP_* - optional for email invites
  - SENTRY_DSN - optional error reporting

Features implemented
- JWT auth (register/login)
- Projects with owner/collaborators
- File CRUD (protected to project members)
- Real-time sync via socket.io (debounced client edits)
- Presence (who's viewing) and cursor sync with colored carets and name badges
- Shareable project links (token-based invites)
- File versioning/history with revert support

Notes
- Presence is currently in-memory. For production scale, move presence to Redis and enable the socket.io Redis adapter.
- Versioning snapshots are stored in Mongo; add retention/TTL for long-term data management.

Next recommended tasks
- Add a CI workflow to run linting, backend tests, and the frontend build on each push.
- Add `/health` and `/ready` endpoints and graceful shutdown handling in the backend.

# CodeEditor