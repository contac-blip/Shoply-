import express from 'express';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import { auth } from '../Auth/auth.js';
import mtnService from '../src_js/fintech/mtnMockService.js';

const router = express.Router();

router.post('/initiate', auth, tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { mobile, amountCents, externalRef, orderId } = req.body;
    if (!mobile || !amountCents) return res.status(400).json({ error: 'mobile and amountCents required' });
    const ref = externalRef || `order_${Date.now()}`;
    const result = await mtnService.initiateCollection(tenantId, mobile, Number(amountCents), ref, orderId);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('momo initiate error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Webhook: use express.raw at route-level to preserve raw body
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const raw = req.body.toString('utf8');
    const headers = req.headers;
    const result = await mtnService.momoWebhookHandler(raw, headers);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('momo webhook error', err);
    return res.status(400).json({ error: String(err) });
  }
});

export default router;
