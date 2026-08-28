import http from 'http';
import crypto from 'crypto';

const baseUrl = process.env.PRODUCTION_BASE_URL || 'http://localhost:3000';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

async function requestJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (err) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout for ${path}`));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

async function run() {
  const checks = [];

  try {
    const health = await requestJson('/health');
    checks.push({ name: 'health', ok: health.statusCode === 200 });

    const tenantId = process.env.SMOKE_TENANT_ID || 'tenant-test';
    const signer = process.env.MTN_WEBHOOK_SECRET || 'change_me_in_prod';
    const payload = JSON.stringify({
      externalRef: `smoke-${Date.now()}`,
      status: 'SUCCESSFUL',
      amountCents: 2500,
      tenantId,
    });

    const signature = crypto.createHmac('sha256', signer).update(payload).digest('hex');
    const webhook = await requestJson('/api/momo/webhook', {
      method: 'POST',
      headers: { 'x-mtn-signature': signature },
      body: payload,
    });
    checks.push({ name: 'webhook-signature', ok: webhook.statusCode === 200 });

    const summary = await requestJson('/api/reporting/merchant');
    checks.push({ name: 'merchant-reporting', ok: [200, 401, 403].includes(summary.statusCode) });
  } catch (error) {
    console.error('Smoke check failed:', error);
    process.exitCode = 1;
    return;
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.error('Smoke check failed:', failed);
    process.exitCode = 1;
    return;
  }

  console.log('Production smoke check passed:', checks);
}

run();
