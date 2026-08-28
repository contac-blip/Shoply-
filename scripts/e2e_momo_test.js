import db from '../config/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

async function main() {
  // find tenant
  const tenant = await db('tenants').where({ slug: 'test-tenant' }).first();
  if (!tenant) {
    console.error('No test tenant found. Run seeds first.');
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log('Using tenant id:', tenantId);

  const amountCents = 5000;
  const mobile = '26870000000';
  const externalRef = `e2e-${Date.now()}`;

  // ensure a test user and token for auth
  let user = await db('users').first();
  if (!user) {
    const [u] = await db('users').insert({ email: 'e2e@test.local', password_hash: 'x', first_name: 'E2E' }).returning('*');
    user = u;
  }
  const token = jwt.sign({ id: user.id }, env.JWT_SECRET);

  // initiate collection
  console.log('Calling initiateCollection...');
  const initResp = await fetch('http://localhost:3000/api/momo/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ mobile, amountCents, externalRef }),
  });
  console.log('initiate status', initResp.status);
  console.log(await initResp.json());

  // build webhook payload
  const payload = { externalRef, status: 'SUCCESSFUL', amountCents, tenantId };
  const raw = JSON.stringify(payload);
  const secret = process.env.MTN_WEBHOOK_SECRET || 'change_me_in_prod';
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  console.log('Sending webhook...');
  const wh = await fetch('http://localhost:3000/api/momo/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-mtn-signature': signature, 'Authorization': `Bearer ${token}` },
    body: raw,
  });
  console.log('webhook status', wh.status);
  console.log(await wh.json());

  // Query DB for transaction, accounts, ledger entries
  const tx = await db('transactions').where({ external_ref: externalRef }).first();
  console.log('transaction:', tx);

  const accounts = await db('accounts').select('*');
  console.log('accounts:', accounts);

  const entries = await db('ledger_entries').where({ transaction_id: tx.id });
  console.log('ledger entries for tx:', entries);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
