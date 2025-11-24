# MongoDB Atlas Provisioning & Backup Plan

This document describes a small, repeatable plan to provision a MongoDB instance for staging/production using MongoDB Atlas, enable backups, and verify connectivity. It's written for a personal/resume demo deployment (Vercel frontend + Render backend + Atlas DB).

## Goals
- Create a managed MongoDB cluster on Atlas.
- Configure a least-privilege database user for the application.
- Enable continuous/backups and daily snapshot retention.
- Provide a `MONGODB_URI` example and instructions to add it to Render/Vercel/GitHub Actions secrets.
- Add a small verification step and a connection test script.

## Atlas Quicksteps (manual)
1. Sign in to https://cloud.mongodb.com/ (or create an account).
2. Create a new Project (e.g. `codeeditor-staging`).
3. Build a Cluster:
   - Provider: AWS / GCP / Azure (pick the region closest to your Render/Vercel region).
   - Tier: For a personal demo, choose M0/M2 (free/sandbox) or M10 for low-cost production-like testing.
   - Storage Auto-Scaling: enabled (recommended).
   - Network: Leave default VPC unless you have VPC peering needs.
4. After cluster is created, go to "Database Access" → Add New Database User:
   - Username: `codeeditor_app` (or similar)
   - Password: generate a strong password and record it in your secret store
   - Roles: `readWriteAnyDatabase` (for simple demos). For stricter production, use a role scoped to the app database only.
5. Network Access: Add IP access list (allow Render/CI IPs or 0.0.0.0/0 for quick testing — not recommended for production). For staging, add your local dev IP and `0.0.0.0/0` temporarily.
6. Get Connection String: In the Atlas UI -> Connect -> Connect your application -> copy the connection string. It looks like:

```
mongodb+srv://codeeditor_app:<PASSWORD>@cluster0.abcd1.mongodb.net/codeeditor?retryWrites=true&w=majority
```

Replace `<PASSWORD>` with the generated password and `codeeditor` with your database name.

## Backups
1. In Atlas, navigate to the cluster -> Backup.
2. Enable Continuous Backups (if available for chosen tier) or Cloud Provider Snapshots.
3. Set a retention policy appropriate for your needs (e.g., daily snapshots kept for 7–30 days).
4. Enable point-in-time restore (if available) for quick rollbacks.

## Monitoring & Alerts
- Enable basic monitoring and set alerts for disk usage, CPU, and replication lag (if using replica sets).
- Configure an email/SMS webhook for alerts.

## Secrets & CI integration
Set the following secrets in your deployment platform (Render / Vercel / GitHub Actions):

- MONGODB_URI: full connection string (with username & password). Example:
  - `mongodb+srv://codeeditor_app:supersecret@cluster0.abcd1.mongodb.net/codeeditor?retryWrites=true&w=majority`
- NODE_ENV: `production`
- SENTRY_DSN: optional (if you use Sentry)
- JWT_SECRET: application JWT secret

On Render: add these as Environment Variables in your service settings. On Vercel, add them under Project Settings → Environment Variables. In GitHub Actions, add them as repository secrets.

## Rotation & Backups Plan
- Rotate the database password every 90 days.
- To rotate safely: create a new DB user with new password, update the app secret in CI/deploy, test staging, then delete the old user.
- Schedule an export (mongoexport) monthly and keep a copy in an external storage (optional).

## Example: verify connectivity (quick steps)
1. Locally, set the `MONGODB_URI` env var (replace with your real URI):

```bash
export MONGODB_URI="mongodb+srv://codeeditor_app:SUPERSECRET@cluster0.abcd1.mongodb.net/codeeditor?retryWrites=true&w=majority"
node backend/scripts/test-mongo-connection.js
```

2. The script will connect, create a small `healthcheck` document, then delete it and report success.

## Automation & Terraform (optional)
- For repeatable infra, consider creating a Terraform script using the `mongodbatlas` provider to provision the cluster, database users, and IP whitelist.

## Appendix: minimal security checklist before production
- Use a dedicated DB user scoped to a single DB and least privileges.
- Restrict IP access (do not use 0.0.0.0/0 in production).
- Enable backups and test restore periodically.
- Keep `MONGODB_URI` in secrets (never commit to repo).
- Use TLS (Atlas enforces TLS by default).

If you want, I can convert this into a Terraform plan and add the IaC files next.
