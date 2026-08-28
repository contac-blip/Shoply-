import express from 'express';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import mtnService from '../fintech/mtnMockService';
import prisma from '../models/prismaClient';

const router = express.Router();

/**
 * POST /momo/initiate
 * Body: { mobile: string, amountCents: number, externalRef?: string }
 * - Requires `X-Tenant-ID` header (handled by tenantMiddleware)
 */
router.post('/initiate', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenantId as string;
    const { mobile, amountCents, externalRef } = req.body;
    if (!mobile || !amountCents) return res.status(400).json({ error: 'mobile and amountCents required' });

    const ref = externalRef || `order_${Date.now()}`;
    const result = await mtnService.initiateCollection(tenantId, mobile, Number(amountCents), ref);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('momo initiate error', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /momo/webhook
 * - MTN will POST callbacks here. Important: the raw request body must be used
 *   to verify signatures. When mounting this router, ensure you use express.raw({ type: '* / *' })
 *   for this route or the app-level raw parser, otherwise signature verification will fail.
 */
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
