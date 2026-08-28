feat(multi-store): prepare multi-store support (migrations, backfill, middleware, controller patches)

This branch (`feature/multi-store-prep`) prepares the backend for multi-store / multi-tenant marketplace support. These changes are draft artifacts intended for review and staging testing only — do NOT run against production.

Summary of changes
- Draft Knex migrations to add `merchants`, `merchant_stores`, and tenant indexes (in `migrations/`)
- Backfill script: `scripts/backfill_tenants.js` to populate `tenant_id` on `products`, `orders`, and `carts` (staging only)
- Tenant ownership middleware (`src/middleware/tenantMiddleware.ts` and JS variant)
- `ensureMerchantForStore` middleware (TS + JS)
- Controller patches to scope `products`, `orders`, `carts`, `reviews`, and `wishlist` to tenant context
- Auth improvements: include `role` in access tokens + `POST /logout` to revoke refresh tokens
- Defensive webhook handling: tenant-aware order updates in `src_js/fintech/mtnMockService.js`

Important notes
- Migrations are intentionally draft: review and run on staging first.
- Backfill must be run on a staging snapshot and mixed-tenant records remediated before making `tenant_id` NOT NULL.
- The code now enforces tenant-scoping when `X-Tenant-ID` header (or other tenant middleware) provides context.

How to run backfill (staging)

Unix / macOS / WSL:
```bash
NODE_ENV=staging node scripts/backfill_tenants.js
```
PowerShell (Windows):
```powershell
$env:NODE_ENV = 'staging'
node scripts/backfill_tenants.js
```

Expected output
- Counts of backfilled products, orders, and carts
- Lists of sample `mixed-tenant` orders and carts for manual review

Next steps (recommended staging rollout)
1. Create a staging DB snapshot (full copy of production data)
2. Run tests locally against staging snapshot
3. Run `scripts/backfill_tenants.js` and review `mixed-tenant` reports
4. Manually remediate or delete mixed-tenant records as appropriate
5. Finalize and run migrations to add indexes and constraints
6. Make `tenant_id` NOT NULL and add foreign key constraints (after backfill)
7. Run integration tests and deploy

Manual PR creation
- Branch: `feature/multi-store-prep` is pushed. Create a draft PR targeting `main` with this description.
- If `gh` CLI is available, run:
```bash
gh pr create --fill --draft --base main --head feature/multi-store-prep --title "feat(multi-store): prepare multi-store support (migrations, backfill, middleware, controller patches)" --body "$(cat PR_DESCRIPTION.md)"
```

If you'd like, I can:
- Run the backfill on a staging DB (you must provide staging DB access or confirm environment variables)
- Finalize migrations and run them on staging (requires confirmation)
- Create the PR body and open the draft PR via GitHub web UI (I can paste the description here for you)

---
