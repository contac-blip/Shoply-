# GoCart Production Hardening Runbook

## Restart policy

- The app should be run behind a process manager or platform-managed restart policy.
- The server listens for SIGINT and SIGTERM and attempts graceful shutdown.
- On shutdown, the merchant summary scheduler is stopped before the HTTP server closes.
- A 15 second timeout is enforced; if shutdown does not finish, the process exits forcibly.
- Recommended production deployment: Render, Docker, or a process manager with automatic restart on crash.

## Rollback strategy

1. Keep a database backup before applying migrations.
2. Tag releases and keep the previous app build available.
3. If the new deployment fails health checks, revert to the previous release immediately.
4. If the DB schema migration is problematic, restore the database from backup and redeploy the prior app version.
5. Never run irreversible production writes without a backup and rollback plan.

## Production smoke checks

Before going live, run:

```bash
PRODUCTION_BASE_URL=http://localhost:3000 SMOKE_TENANT_ID=tenant-test MTN_WEBHOOK_SECRET=change_me_in_prod node scripts/productionSmokeCheck.mjs
```

Expected checks:
- health returns 200
- webhook signature check passes
- merchant reporting endpoint responds successfully or with a controlled auth error

## Alerting and monitoring

Recommended minimum setup:
- health endpoint alerting every 1–5 minutes
- alert on webhook signature failures
- alert on scheduler job failures or repeated skipped summary writes
- alert on DB connection failures and elevated 5xx rates
- centralized log aggregation for requests, auth failures, and webhook traffic

## Live validation checklist

- confirm DATABASE_URL is production-ready
- confirm JWT_SECRET is set and unique
- confirm MTN_WEBHOOK_SECRET is set in production
- ensure tenant header is passed on every protected request
- validate a tenant mismatch is rejected at runtime
- validate a valid webhook signature is accepted and invalid ones are rejected
- validate summary job executes once and shuts down cleanly
- perform a rollback drill using a backup and previous release
