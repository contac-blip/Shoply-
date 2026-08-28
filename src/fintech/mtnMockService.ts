import fetch from 'node-fetch';
import crypto from 'crypto';
import ledgerService from './ledgerService';
import prisma from '../models/prismaClient';

const MOCK_GATEWAY = process.env.MTN_MOCK_GATEWAY || 'https://mock-mtn-gateway.local';
const WEBHOOK_SECRET = process.env.MTN_WEBHOOK_SECRET || 'change_me_in_prod';

export class MtnMockService {
  // Initiates a mock USSD payment prompt (collection)
  async initiateCollection(tenantId: string, mobile: string, amountCents: number, externalRef: string) {
    // Create an order and a pending transaction for idempotency / reconciliation
    const order = await prisma.order.create({
      data: {
        tenant_id: tenantId,
        amountCents,
        status: 'INITIATED',
        externalRef,
      },
    });

    // Fire-and-forget to the mock gateway with timeout handling
    const payload = { mobile, amountCents, externalRef };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000); // 8s timeout for push

    try {
      const resp = await fetch(`${MOCK_GATEWAY}/ussd/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        // mark the order as failed to initiate; real gateway may still send webhooks later
        await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
        return { status: 'gateway_error', statusCode: resp.status };
      }

      const data = await resp.json();
      // The mock gateway may return a providerRequestId used for correlation
      return { status: 'initiated', providerRef: data.requestId || null, orderId: order.id };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        // USSD push timed out; keep order INITIATED and rely on webhook or manual reconciliation
        await prisma.order.update({ where: { id: order.id }, data: { status: 'PENDING' } });
        return { status: 'timeout', message: 'USSD push timed out; awaiting webhook' };
      }
      // Unexpected error
      await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      return { status: 'error', error: String(err) };
    }
  }

  /**
   * Handle incoming MTN webhook payloads.
   * - Verifies HMAC signature
   * - Updates order/transaction status
   * - Calls ledgerService.handlePaymentConfirmation when payment confirmed
   */
  async momoWebhookHandler(rawBody: string, headers: any) {
    // Verify signature header `x-mtn-signature` using WEBHOOK_SECRET
    const sig = headers['x-mtn-signature'] || headers['x-mtn-signature'.toLowerCase()];
    if (!sig) throw new Error('missing signature');

    const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig))) {
      throw new Error('invalid signature');
    }

    const payload = JSON.parse(rawBody);
    const { externalRef, status, amountCents, tenantId } = payload;

    // Map provider statuses to our Order/Transaction statuses
    if (status === 'SUCCESSFUL') {
      // Mark order as Paid
      const order = await prisma.order.findUnique({ where: { externalRef } });
      if (order) {
        await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      }
      // Trigger ledger split safely
      const r = await ledgerService.handlePaymentConfirmation({ externalRef, tenantId: tenantId || (order && order.tenant_id) || '', amountCents });
      return r;
    }

    if (status === 'FAILED') {
      // update order/transaction to failed
      await prisma.order.updateMany({ where: { externalRef }, data: { status: 'FAILED' } });
      await prisma.transaction.updateMany({ where: { externalRef }, data: { status: 'FAILED' } });
      return { status: 'marked_failed' };
    }

    // For other intermediate statuses, record and no-op (still awaiting final result)
    await prisma.order.updateMany({ where: { externalRef }, data: { status: 'PENDING' } });
    return { status: 'pending' };
  }
}

export default new MtnMockService();
