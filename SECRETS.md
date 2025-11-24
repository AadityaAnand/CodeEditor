# Secrets and CI Integration Guide

This file lists the secrets required by the application and how to store them in common platforms (GitHub Actions, Render, Vercel). Use a secrets manager for production and avoid committing any secrets to the repository.

## Required secrets (short name -> meaning)

- MONGODB_URI — Full MongoDB connection string, including username and password.
  - Example: `mongodb+srv://codeeditor_app:SUPERSECRET@cluster0.abcd1.mongodb.net/codeeditor?retryWrites=true&w=majority`
- JWT_SECRET — Secret used to sign JWTs for auth. Keep this random and long.
- SENTRY_DSN — Optional Sentry Data Source Name (only if using Sentry).
- NODE_ENV — `production` for production deploys.
- REDIS_URL — Optional: Redis URL if you enable socket.io redis adapter or other Redis-backed services.
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — Optional SMTP creds for email invites/notifications.

## Where to add them

### GitHub Actions
Add repository secrets (Settings → Secrets and variables → Actions → New repository secret). Use the same key names as above.

Example usage in a workflow step:

```yaml
- name: Deploy to Render (example)
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  run: |
    # build or smoke test commands which use the env vars
    npm --prefix backend run verify-db
```

### Render
In Render dashboard → Your Service → Environment → Environment Variables, add keys and values. Mark values as "Protected" if Render supports it.

### Vercel
Project Settings → Environment Variables. Add keys for `VERCEL_ENV=production` and runtime secrets.

## Secret rotation recommendations

- Rotate `JWT_SECRET` and database passwords every 90 days or sooner if leaked.
- When rotating DB credentials: create a new user + password, update the secret in CI/deploy, deploy to staging, test, then remove the old user.

## Notes for CI and local development

- For local development you can use an `.env` file (not checked into source). Example `.env` values are in `env.example`.
- In CI, avoid printing secrets in logs. Use them through environment variables only.

If you'd like, I can add sample GitHub Actions steps that create a `secrets.example` or validate that required secrets are present before running deploy steps.
