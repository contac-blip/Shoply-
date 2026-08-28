import crypto from 'crypto';
import ledgerService from './ledgerService.js';
import { recordMerchantPaymentAllocation } from './merchantSettlementService.js';
import db from '../../config/db.js';

// Default to local in-process mock gateway mounted on the same server
const MOCK_GATEWAY = process.env.MTN_MOCK_GATEWAY || 'http://localhost:3000/mock-mtn';
const WEBHOOK_SECRET = process.env.MTN_WEBHOOK_SECRET || 'change_me_in_prod';
const PROVIDER_FEE_PERCENT = Number(process.env.PAYMENT_PROVIDER_FEE_PERCENT || 0);

class MtnMockService {
  async initiateCollection(tenantId, mobile, amountCents, externalRef, orderId = null) {
    let resolvedOrderId = orderId;
    if (resolvedOrderId) {
      const existingOrder = await db('orders').where({ id: resolvedOrderId, tenant_id: tenantId }).first();
      if (!existingOrder) throw new Error('Order not found for tenant');
      await db('orders').where({ id: resolvedOrderId }).update({ external_ref: externalRef, status: 'INITIATED' });
    } else {
      const inserted = await db('orders').insert({ tenant_id: tenantId, total_amount: amountCents / 100.0, status: 'INITIATED', external_ref: externalRef }).returning('id');
      resolvedOrderId = Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted;
    }

    const payload = { mobile, amountCents, externalRef };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch(`${MOCK_GATEWAY}/ussd/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        await db('orders').where({ id: resolvedOrderId }).update({ status: 'FAILED' });
        return { status: 'gateway_error', statusCode: resp.status };
      }
      const data = await resp.json();
      return { status: 'initiated', providerRef: data.requestId || null, orderId: resolvedOrderId };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        await db('orders').where({ id: resolvedOrderId }).update({ status: 'PENDING' });
        return { status: 'timeout', message: 'USSD push timed out; awaiting webhook' };
      }
      await db('orders').where({ id: resolvedOrderId }).update({ status: 'FAILED' });
      return { status: 'error', error: String(err) };
    }
  }

  async momoWebhookHandler(rawBody, headers) {
    const sig = headers['x-mtn-signature'] || headers['x-mtn-signature'.toLowerCase()];
    if (!sig) throw new Error('missing signature');
    const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig))) throw new Error('invalid signature');

    const payload = JSON.parse(rawBody);
    const { externalRef, status, amountCents, tenantId } = payload;

    if (status === 'SUCCESSFUL') {
      const order = await db('orders').where({ external_ref: externalRef }).first();
      if (order) {
        // If tenantId provided in webhook, ensure it matches order tenant
        if (tenantId && String(order.tenant_id) !== String(tenantId)) {
          // Log mismatch and skip updating order status to avoid cross-tenant updates
          console.warn('Webhook tenantId mismatch for externalRef', externalRef);
        } else {
          await db('orders').where({ id: order.id }).update({ status: 'PAID' });
        }
      }
      const r = await ledgerService.handlePaymentConfirmation({ externalRef, tenantId: tenantId || (order && order.tenant_id) || '', amountCents });

      if (order && r.status !== 'error') {
        const merchantStore = await db('merchant_stores')
          .where({ tenant_id: order.tenant_id })
          .first();
        if (merchantStore) {
          const grossAmount = Number(amountCents || Math.round(Number(order.total_amount || 0) * 100)) / 100;
          const providerFee = grossAmount * (PROVIDER_FEE_PERCENT / 100);
          const commission = grossAmount * (ledgerService.platformFeePercent || 0);
          await recordMerchantPaymentAllocation(db, {
            merchantId: merchantStore.merchant_id,
            tenantId: order.tenant_id,
            orderId: order.id,
            grossCustomerPayment: grossAmount,
            paymentProviderFee: providerFee,
            shoplyCommission: commission,
          });
        }
      }

      return r;
    }

    if (status === 'FAILED') {
      const order = await db('orders').where({ external_ref: externalRef }).first();
      if (order) {
        if (!tenantId || String(order.tenant_id) === String(tenantId)) {
          await db('orders').where({ id: order.id }).update({ status: 'FAILED' });
          await db('transactions').where({ external_ref: externalRef }).update({ status: 'FAILED' });
        } else {
          console.warn('Webhook tenantId mismatch for externalRef (FAILED)', externalRef);
        }
      }
      return { status: 'marked_failed' };
    }
    const order = await db('orders').where({ external_ref: externalRef }).first();
    if (order) {
      if (!tenantId || String(order.tenant_id) === String(tenantId)) {
        await db('orders').where({ id: order.id }).update({ status: 'PENDING' });
      } else {
        console.warn('Webhook tenantId mismatch for externalRef (PENDING)', externalRef);
      }
    }
    return { status: 'pending' };
  }
}

export default new MtnMockService();
