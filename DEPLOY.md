Deploy guide — Personal/resume deployment

Goal: Deploy frontend as a static site (Vercel) and backend as a managed Node web service (Render). Use MongoDB Atlas for production database. This path is quick, low-cost, and works well for a personal project.

High-level flow
1. Create MongoDB Atlas cluster and DB user.
2. Connect repo to Vercel for the frontend build.
3. Connect repo to Render for the backend service and set environment variables.
4. Configure CORS/CLIENT_ORIGIN to point to the frontend URL.
5. Run smoke tests.

Required environment variables (backend)
- MONGODB_URI - connection string from Atlas, example: mongodb+srv://user:pass@cluster0.mongodb.net/code_editor_prod?retryWrites=true&w=majority
- JWT_SECRET - a strong secret string
- CLIENT_ORIGIN - e.g. https://your-frontend-url.vercel.app
- PORT - 5050 (Render sets automatically usually)
- SENTRY_DSN - optional
- SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS - optional

Deploy steps (recommended)

A) MongoDB Atlas (15-45 min)
- Create an Atlas account and new project.
- Create a free cluster.
- Create a database user with a secure password and note the username/password.
- Add your Render/Vercel IPs to IP Access List or allow access from anywhere (0.0.0.0/0) for quick setup and then lock down later.
- Copy the connection string and replace <username>, <password>, and <dbname>.
- Enable backup snapshots (default on paid tiers). Free tier has basic backup options.

B) Frontend -> Vercel (5-15 min)
- Go to Vercel and sign in with GitHub.
- Import the `frontend` directory (Vercel auto-detects React CRA and runs build: `npm run build`).
- Set the Root Directory to `frontend` if asked.
- Deploy; note the assigned URL (e.g., https://code-editor-username.vercel.app).

C) Backend -> Render (15-30 min)
- Sign in to Render and create a new Web Service.
- Connect the GitHub repo and choose the `backend` folder as the root.
- Build Command: `npm ci` (or `npm install`) and Start Command: `node server.js` (Render may auto-detect Node).
- Set environment variables in Render's dashboard using the values from step A.
  - MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN (set to Vercel URL), PORT (optional)
- Deploy the service. Note the service URL (e.g., https://code-editor-backend.onrender.com).

D) Final checks and CORS
- Ensure `CLIENT_ORIGIN` in backend env matches the frontend URL.
- If using socket.io over websockets, ensure Render supports websockets (it does). Configure frontend socket to connect to the backend URL.

E) Smoke tests (manual or scripted)
- Register a user via frontend or API:
  - POST https://<backend>/auth/register { email, password, name }
- Login and obtain token, then try protected endpoints:
  - POST https://<backend>/api/projects { name }
  - POST https://<backend>/api/projects/:projectId/files { name, type: 'file', content }
  - GET https://<backend>/api/files/:fileId/history
- Verify frontend loads, can open editor, and performs save/restore flows.

Rollback (quick)
- For Render/Vercel: Redeploy previous commit via the service UI (each deploy keeps history).
- For Atlas: rotate credentials and update env on Render if needed.

Notes
- Keep secrets out of the repo. Use Render and Vercel environment settings or GitHub Actions secrets.
- For a resume demo, this stack is convenient: Vercel (static frontend), Render (backend), Atlas (DB).
- If you'd like, I can create a small smoke-test script and a Render/Vercel deployment template.


