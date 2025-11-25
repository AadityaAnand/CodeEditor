# Deployment Runbook — CodeEditor

Quick one-day deployment checklist for demo/production.

## ✅ Pre-Deployment Checklist

- [ ] All CI checks passing (tests + build + smoke tests)
- [ ] MongoDB Atlas cluster provisioned with backups enabled
- [ ] All secrets configured in GitHub/Render/Vercel
- [ ] DEPLOY.md reviewed and deployment steps understood
- [ ] Local smoke test passed: `BACKEND_URL=http://localhost:5050 node scripts/smoke.js`

## 🚀 Deployment Steps

### 1. Provision MongoDB Atlas (15 mins)

Follow [PROVISIONING.md](./PROVISIONING.md):

```bash
# 1. Create MongoDB Atlas account
# 2. Create M0 (free) cluster or M10+ for production
# 3. Configure Network Access (allow your IP + deployment IPs)
# 4. Create database user with readWrite permissions
# 5. Get connection string (replace <password> and <dbname>)
# 6. Enable automated backups (Atlas → Backup tab)
# 7. Test connection locally:
cd backend && node scripts/test-mongo-connection.js
```

**Connection string format**:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

### 2. Configure Secrets (10 mins)

See [SECRETS.md](./SECRETS.md) for detailed instructions.

**Required secrets**:
- `MONGODB_URI` — Atlas connection string from step 1
- `JWT_SECRET` — Generate with: `openssl rand -hex 32`
- `CLIENT_ORIGIN` — Your frontend URL (e.g., `https://your-app.vercel.app`)

**Optional secrets**:
- `SENTRY_DSN` — For error tracking (sign up at sentry.io)
- `REDIS_URL` — For socket.io adapter if using multi-instance backend
- `LOG_LEVEL` — `info` for production, `debug` for staging

**Set in platforms**:

**GitHub Actions** (for CI):
```
Settings → Secrets and variables → Actions → New repository secret
Add: MONGODB_URI, JWT_SECRET, SENTRY_DSN
```

**Render** (backend):
```
Dashboard → Your Service → Environment → Add Environment Variable
Add: MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, SENTRY_DSN, NODE_ENV=production
```

**Vercel** (frontend):
```
Project Settings → Environment Variables
Add: REACT_APP_API_URL (your backend URL, e.g., https://your-backend.onrender.com)
```

### 3. Deploy Backend to Render (20 mins)

1. **Connect GitHub repo**:
   - Go to [render.com](https://render.com) → New → Web Service
   - Connect GitHub account and select `CodeEditor` repo
   - Branch: `main`

2. **Configure service**:
   ```
   Name: codeeditor-backend
   Root Directory: backend
   Environment: Node
   Build Command: npm install
   Start Command: node server.js
   Plan: Free (or Starter for production)
   ```

3. **Add environment variables** (see step 2)

4. **Deploy**: Click "Create Web Service"

5. **Verify**: Once deployed, test health endpoint:
   ```bash
   curl https://your-backend.onrender.com/health
   # Should return: {"status":"ok"}
   ```

### 4. Deploy Frontend to Vercel (15 mins)

1. **Connect GitHub repo**:
   - Go to [vercel.com](https://vercel.com) → Add New Project
   - Import `CodeEditor` repo from GitHub
   - Root Directory: `frontend`

2. **Configure build**:
   ```
   Framework Preset: Create React App
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

3. **Add environment variables**:
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```

4. **Deploy**: Click "Deploy"

5. **Verify**: Visit your Vercel URL (e.g., `https://your-app.vercel.app`)

6. **Update backend `CLIENT_ORIGIN`**: Go back to Render and set `CLIENT_ORIGIN` to your Vercel URL

### 5. Run Smoke Test (5 mins)

```bash
BACKEND_URL=https://your-backend.onrender.com node scripts/smoke.js
```

Expected output:
```
[smoke] Checking /health endpoint
[smoke] ✓ Health check passed
[smoke] Registering user smoke+...@example.com
[smoke] Logging in
[smoke] Creating project
[smoke] Creating file
[smoke] Fetching history
[smoke] Smoke test success — projectId: ... fileId: ...
```

If smoke test fails, check:
- Backend logs in Render dashboard
- Network tab in browser DevTools for CORS errors
- `CLIENT_ORIGIN` matches your Vercel URL exactly
- MongoDB Atlas Network Access allows Render IPs

### 6. Manual Verification (10 mins)

1. **Register/Login**:
   - Visit `https://your-app.vercel.app`
   - Click "Try the editor"
   - Register a new account
   - Verify you receive a JWT token (check DevTools → Application → localStorage)

2. **Create Project**:
   - Create a new project
   - Verify it appears in the project list

3. **Create File & Edit**:
   - Create a new file in the project
   - Type some code in Monaco editor
   - Verify auto-save works (check Network tab for PUT requests)

4. **Real-time Sync** (if you have 2 devices/browsers):
   - Open same project/file in two browser tabs
   - Edit in one tab, verify changes appear in the other

5. **Version History**:
   - Click "History" button
   - Verify versions are listed
   - Click "Revert" on an old version
   - Verify file content reverts

## 🔄 Rollback Plan

If deployment fails or smoke test doesn't pass:

**Backend (Render)**:
```
Render Dashboard → Your Service → Manual Deploy → Select previous commit → Deploy
```

**Frontend (Vercel)**:
```
Vercel Dashboard → Your Project → Deployments → Select previous deployment → Promote to Production
```

## 📊 Post-Deployment Monitoring

1. **Health checks**:
   ```bash
   # Add to uptime monitor (e.g., UptimeRobot, Pingdom)
   https://your-backend.onrender.com/health
   ```

2. **Sentry dashboard**:
   - Check [sentry.io](https://sentry.io) for errors
   - Set up alerts for critical errors

3. **Logs**:
   - Render: Dashboard → Your Service → Logs
   - Vercel: Dashboard → Your Project → Deployments → [Latest] → Function Logs

4. **MongoDB Atlas**:
   - Check Metrics tab for performance
   - Verify backups are running (Backup tab)

## 🐛 Common Issues

**Issue**: Backend returns 502 Bad Gateway  
**Fix**: Check Render logs, verify `MONGODB_URI` is correct and Atlas Network Access allows Render IPs

**Issue**: CORS errors in browser  
**Fix**: Ensure `CLIENT_ORIGIN` in Render exactly matches your Vercel URL (no trailing slash)

**Issue**: Socket.io connection fails  
**Fix**: Check that WebSocket connections aren't blocked by firewall/proxy; verify CORS settings include WebSocket upgrade

**Issue**: Files not saving  
**Fix**: Check browser DevTools Network tab for 401/403 errors; verify JWT token is present and valid

## 📞 Support

For issues not covered here:
1. Check [GitHub Issues](https://github.com/AadityaAnand/CodeEditor/issues)
2. Review backend logs in Render dashboard
3. Check Sentry for error traces
4. Test locally with same environment variables

## ✅ Final Checklist

After deployment:
- [ ] Smoke test passed against production backend
- [ ] Manual verification completed (register, login, create project/file, edit, history)
- [ ] Health monitoring configured (uptime checks)
- [ ] Sentry alerts configured
- [ ] MongoDB Atlas backups verified
- [ ] All secrets documented in SECRETS.md
- [ ] Rollback plan tested

---

**Total deployment time**: ~75 minutes (assumes no major issues)

**Next steps after successful deployment**:
- Add Redis adapter for socket.io if scaling to multiple backend instances
- Configure CDN for frontend static assets
- Set up staging environment for testing changes before production
