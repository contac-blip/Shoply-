import request from 'supertest';
import appModule from '../index.js';
import db from '../config/db.js';
import crypto from 'crypto';

// The project's router is exported in index.js; create a minimal express app for supertest
import express from 'express';
const app = express();
app.use(express.json());
app.use('/api', appModule);

const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const describeIfDb = runDbIntegration ? describe : describe.skip;

describeIfDb('MTN MoMo integration', () => {
  let tenantId;
  beforeAll(async () => {
    const tenant = await db('tenants').where({ slug: 'test-tenant' }).first();
    tenantId = tenant.id;
  });

  test('webhook triggers ledger split', async () => {
    const amountCents = 3000;
    const externalRef = `jest-${Date.now()}`;

    // initiate
    // create test user and token
    let user = await db('users').first();
    if (!user) {
      const [u] = await db('users').insert({ email: 'test@local', password_hash: 'x', first_name: 'Test' }).returning('*');
      user = u;
    }
    const jwt = (await import('jsonwebtoken')).default;
    const env = (await import('../config/env.js')).default;
    const token = jwt.sign({ id: user.id }, env.JWT_SECRET);

    await request(app)
      .post('/api/momo/initiate')
      .set('X-Tenant-ID', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .send({ mobile: '26870000000', amountCents, externalRef })
      .expect(200);

    const payload = { externalRef, status: 'SUCCESSFUL', amountCents, tenantId };
    const raw = JSON.stringify(payload);
    const secret = process.env.MTN_WEBHOOK_SECRET || 'change_me_in_prod';
    const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    const wh = await request(app)
      .post('/api/momo/webhook')
      .set('x-mtn-signature', signature)
      .set('Authorization', `Bearer ${token}`)
      .send(raw)
      .expect(200);

    // Verify transaction created and completed
    const tx = await db('transactions').where({ external_ref: externalRef }).first();
    expect(tx).toBeDefined();
    expect(tx.status).toBe('COMPLETED');

    // Verify ledger entries exist
    const entries = await db('ledger_entries').where({ transaction_id: tx.id });
    expect(entries.length).toBeGreaterThanOrEqual(2);
  }, 20000);
});
  afterAll(async () => {
    // destroy DB pool to avoid open handles
    await db.destroy();
    try {
      const otherDb = (await import('../DB/db.js')).default;
      if (otherDb && otherDb.destroy) await otherDb.destroy();
    } catch (e) {
      // ignore if not present
    }
  });
