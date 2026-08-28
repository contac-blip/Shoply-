# GoCart Backend Platform

This repository contains the backend for the GoCart commerce platform: a multi-tenant, modular Node.js + Express + PostgreSQL service with support for commerce, inventory, merchant operations, fulfilment, analytics, promos, billing, fraud, support, and reporting.

The project has evolved from a basic store backend into a broader commerce platform backend spanning storefront functionality and operational tooling for merchants and admins.

## Project overview

Core stack:
- Node.js
- Express 5
- PostgreSQL via Knex
- ESM modules
- Jest + Supertest for regression tests
- Socket.IO support for live notifications

Architecture patterns:
- multi-tenant-aware data access through X-Tenant-ID enforcement
- service-layer business logic separated from controllers/routes
- modular route/controller design by domain
- migration-first schema evolution
- scheduler-based operational jobs for reporting and summary materialization

## Where it started

The initial build was a standard ecommerce backend for products, users, auth, carts, and orders. It included:
- authentication and role-based access patterns
- product catalog management
- cart and order flows
- user and admin routes
- basic data persistence with Knex/PostgreSQL
- basic operational helpers and environment configuration

## What has been built since then

### 1. Authentication and user access
Completed:
- JWT-based auth flows
- role normalization for customer, merchant, and admin roles
- authorization middleware for protected routes
- refresh-token and soft-delete patterns in migrations
- tenant-aware user access patterns

Files involved:
- Auth/auth.js
- Controllers/authController.js
- Routes/authRoutes.js
- migrations for refresh tokens and soft deletes

### 2. Multi-tenant and merchant readiness
Completed:
- tenant validation middleware
- X-Tenant-ID propagation and enforcement
- merchant and store scoping logic
- merchant route protection
- tenant-aware order/product/cart filtering
- merchant store mapping and merchant support scaffolding

Files involved:
- src_js/middleware/tenantMiddleware.js
- src/middleware/tenantMiddleware.ts
- src/middleware/ensureMerchantForStore.ts
- Routes/merchantRoutes.js
- scripts/backfill_tenants.js
- migrations around tenancy, merchants, and mapping

### 3. Catalog and inventory management
Completed:
- product management APIs
- category management
- inventory tracking
- low-stock logic and inventory health summaries
- stock-aware analytics queries

Files involved:
- Controllers/productController.js
- Controllers/adminController.js
- Routes/productRoutes.js
- Routes/inventoryRoutes.js
- src_js/analytics/merchantDashboardService.js

### 4. Orders, payments, and fulfilment
Completed:
- cart and checkout workflows
- order creation and status tracking
- payment initiation and ledger handling
- MoMo integration scaffolding and webhook handling
- order fulfillment workflows
- shipment and return request primitives
- order status transitions tied to payment and fulfilment

Files involved:
- Controllers/cartOrderController.js
- Routes/cartOrderRoutes.js
- Routes/momoRoutes.js
- src_js/fintech/mtnMockService.js
- src_js/fintech/ledgerService.js
- Routes/fulfillmentRoutes.js
- Routes/shipmentRoutes.js

### 5. Marketing, promos, and campaigns
Completed:
- campaign and promotional campaign domain logic
- promo code creation and validation support
- campaign analytics hooks
- promo tables and flows integrated into platform logic

Files involved:
- Controllers/promoController.js
- Routes/promoCampaignRoutes.js
- migrations for promo codes and campaigns

### 6. Analytics and merchant dashboards
Completed:
- sales summaries by store
- merchant dashboard aggregation
- inventory health summaries
- return/risk summaries
- merchant reporting service
- summary materialization logic for dashboard snapshots

Files involved:
- src_js/analytics/merchantDashboardService.js
- src_js/reporting/merchantReportingService.js
- src_js/platform/platformOperationsService.js

### 7. Billing, settlements, and reconciliation
Completed:
- payout and settlement summaries
- invoice generation logic
- ledger reconciliation support
- settlement persistence helpers
- ordered financial reconciliation services

Files involved:
- src_js/billing/reconciliationService.js
- Controllers/reconciliationController.js
- Routes/reconciliationRoutes.js

### 8. Fraud, support, and compliance workflows
Completed:
- fraud risk evaluation service
- support ticket workflow summaries
- escalation logic and persistence helpers
- fraud audit logs and compliance-oriented table support
- persisted operational workflow records

Files involved:
- src_js/platform/platformControlsService.js
- Controllers/platformControlsController.js
- Routes/platformControlsRoutes.js
- migrations for audit and risk tables

### 9. Loyalty and refunds
Completed:
- loyalty redemption calculations and discount logic
- refund reversal request logic
- order completion integration hooks for loyalty usage
- refund and reversal workflows supported in platform operations

Files involved:
- src_js/platform/platformOperationsService.js
- related billing and reconciliation services

### 10. Scheduler and operational jobs
Completed:
- merchant summary scheduler
- duplicate job prevention during overlapping execution
- runtime snapshot generation for merchant summaries
- graceful shutdown support for the process lifecycle
- safe persistence behavior when summary tables are unavailable

Files involved:
- src_js/scheduler/merchantSummaryScheduler.js
- server.js

### 11. Production hardening
Completed:
- security headers via Helmet
- compression middleware
- CORS configuration
- request ID injection
- rate limiting on API/auth routes
- centralized error handling
- request logging and audit metadata
- tenant mismatch rejection
- graceful server shutdown handling
- production smoke-check script and deployment runbook

Files involved:
- server.js
- requestId.js
- rateLimiter.js
- errorHandler.js
- logger.js
- auditLogger.js
- DEPLOYMENT_RUNBOOK.md
- scripts/productionSmokeCheck.mjs

## Database and migration coverage

The project includes migration support for:
- core tables for users, products, orders, carts, categories, and payments
- role updates on users
- refresh tokens and soft deletes
- promo codes
- audit logs
- tenancy and ledger support
- merchants and merchant mappings
- cart tenant indexes
- campaign and loyalty flows
- shipments, returns, and support domains
- commissions and reconciliation entries
- fraud and risk tables
- merchant summary materialization tables

The migrations are present under:
- migrations/
- scripts/runMigrations.mjs
- scripts/createDatabase.mjs

## Current project status

### Completed
- platform domain logic is largely in place
- routes and controllers are wired for major modules
- business logic and operational services are implemented
- scheduler, reporting, support, fraud, reimbursement, and reconciliation flows are included
- runtime hardening is in place for app-level security and lifecycle safety
- regression test suite passes for the current workspace

### Remaining live-production work
The remaining items are operational and deployment-specific, not core feature implementation:
- run migrations against the live PostgreSQL database
- verify tenant/auth flows against the real hosting environment
- validate webhook signing against real provider traffic
- smoke-test scheduler jobs in production conditions
- set up monitoring and alerting
- confirm restart policy and auto-recovery on the hosting platform
- establish rollback and backup plan

## Validation status

Current local verification command:

```bash
npm test -- --runInBand
```

This has been run successfully in the current workspace with passing tests, including the production-hardening and scheduler updates.

## Production readiness summary

The backend is functionally strong and significantly hardened, but it is not considered fully production-validated until the live database and deployment environment are exercised with the real secrets and runtime configuration.

## Suggested next steps

1. Deploy to a staging environment using the real Postgres instance.
2. Run all migrations and verify schema integrity.
3. Validate tenant middleware and auth flows using live HTTP calls.
4. Test webhook signature validation with real payloads.
5. Run the production smoke script against the deployed app.
6. Confirm monitoring, alerts, restart policy, and rollback procedure.
7. Promote to production only after all checks pass.

## Repository highlights

Main entry points:
- server.js
- index.js
- config/db.js
- knexfile.js
- render.yaml

Key domain folders:
- Auth/
- Controllers/
- Routes/
- Models/
- src_js/
- src/
- scripts/
- migrations/

## Final note

This backend is now a broad commerce and operations platform rather than a simple store API. It includes the foundations for merchant operations, financial reconciliation, analytics, support/fraud workflows, and production-safe runtime behavior, while still requiring live environment validation before full production release.
