# Testing MTN MoMo Integration (mock)

This file explains how to run the Knex migrations/seeds and how to test the webhook locally.

1) Run migrations and seeds

```bash
cd "GoCart backend"
npx knex migrate:latest
npx knex seed:run
npm run dev
```

2) Create a webhook payload and signature (HMAC-SHA256)

Use Node to generate the signature header `x-mtn-signature`:

```bash
payload='{"externalRef":"test-123","status":"SUCCESSFUL","amountCents":5000,"tenantId":"<tenant-id>"}'
secret="${MTN_WEBHOOK_SECRET:-change_me_in_prod}"
# Using openssl to generate HMAC hex
signature=$(printf "%s" "$payload" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')

# Send to the app (replace host/port if different)
curl -v -X POST http://localhost:3000/api/momo/webhook \
  -H "Content-Type: application/json" \
  -H "x-mtn-signature: $signature" \
  --data "$payload"
```

3) Notes
- Ensure you use the seeded tenant id from the seed (look up `tenants` table in DB).
- The webhook endpoint expects the raw body to validate the signature. The route is mounted at `/api/momo/webhook`.
- For initiate testing: POST `/api/momo/initiate` with JSON `{ "mobile":"2687xxxxxxx", "amountCents":5000 }` and header `X-Tenant-ID: <tenant-id>`.

Edge cases handled by the implementation:
- USSD push timeouts: `initiateCollection` uses an 8s timeout and leaves the order in `PENDING` when the push times out. The system waits for the webhook to finalize the transaction.
- Idempotency: `external_ref` is used to avoid duplicate ledger credits when webhooks are retried.
- Partial failures: ledger splits and balance updates are performed in DB transactions. On failure the transaction is marked `FAILED` for manual reconciliation.
