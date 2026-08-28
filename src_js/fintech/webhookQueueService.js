import db from '../../config/db.js';

const BASE_RETRY_DELAY_SECONDS = 60;
const MAX_RETRIES = 5;

class WebhookQueueService {
  /**
   * Enqueue a webhook for processing with retry capability
   */
  static async enqueueWebhook(tenantId, eventType, payload, maxRetries = MAX_RETRIES) {
    try {
      const result = await db('webhook_queue').insert({
        tenant_id: tenantId,
        event_type: eventType,
        payload,
        status: 'pending',
        max_retries: maxRetries,
        retry_count: 0,
        next_retry_at: new Date(),
      }).returning('*');

      return { success: true, id: result[0]?.id };
    } catch (err) {
      console.error('Failed to enqueue webhook:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Process pending webhooks (called by background job)
   */
  static async processPendingWebhooks() {
    const now = new Date();
    const pending = await db('webhook_queue')
      .where('status', 'pending')
      .where('next_retry_at', '<=', now)
      .limit(50); // Process 50 at a time

    for (const webhook of pending) {
      await this.processWebhook(webhook);
    }

    return { processed: pending.length };
  }

  /**
   * Process a single webhook
   */
  static async processWebhook(webhook) {
    try {
      await db('webhook_queue').where({ id: webhook.id }).update({ status: 'processing' });

      // Route to appropriate handler based on event type
      let result;
      if (webhook.event_type === 'payment.success') {
        result = await this.handlePaymentSuccess(webhook);
      } else if (webhook.event_type === 'payment.failed') {
        result = await this.handlePaymentFailed(webhook);
      } else if (webhook.event_type === 'chargeback.filed') {
        result = await this.handleChargebackFiled(webhook);
      } else {
        throw new Error(`Unknown event type: ${webhook.event_type}`);
      }

      // Mark as completed
      await db('webhook_queue').where({ id: webhook.id }).update({
        status: 'completed',
        updated_at: new Date(),
      });

      return { success: true, result };
    } catch (err) {
      console.error(`Webhook ${webhook.id} processing failed:`, err);

      const nextRetryCount = webhook.retry_count + 1;
      const willRetry = nextRetryCount < webhook.max_retries;

      if (willRetry) {
        // Calculate exponential backoff: 60s, 120s, 240s, 480s, 960s
        const delaySeconds = BASE_RETRY_DELAY_SECONDS * Math.pow(2, nextRetryCount - 1);
        const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

        await db('webhook_queue').where({ id: webhook.id }).update({
          status: 'pending',
          retry_count: nextRetryCount,
          next_retry_at: nextRetryAt,
          error_message: err.message,
          updated_at: new Date(),
        });

        console.log(`Webhook ${webhook.id} scheduled for retry at ${nextRetryAt}`);
      } else {
        // Dead letter queue - permanent failure
        await db('webhook_queue').where({ id: webhook.id }).update({
          status: 'failed',
          retry_count: nextRetryCount,
          error_message: `Max retries exceeded: ${err.message}`,
          updated_at: new Date(),
        });

        console.error(`Webhook ${webhook.id} moved to dead letter queue`);
      }

      return { success: false, error: err.message, willRetry };
    }
  }

  /**
   * Handle successful payment webhook
   */
  static async handlePaymentSuccess(webhook) {
    const { externalRef, amountCents, tenantId } = webhook.payload;

    // Update transaction
    const transaction = await db('transactions').where({ external_ref: externalRef }).first();
    if (!transaction) {
      throw new Error(`Transaction not found for ref: ${externalRef}`);
    }

    await db('transactions').where({ id: transaction.id }).update({
      status: 'COMPLETED',
      updated_at: new Date(),
    });

    // Process ledger split
    const ledgerService = (await import('./ledgerService.js')).default;
    const result = await ledgerService.handlePaymentConfirmation({
      externalRef,
      tenantId: tenantId || transaction.tenant_id,
      amountCents,
    });

    return result;
  }

  /**
   * Handle failed payment webhook
   */
  static async handlePaymentFailed(webhook) {
    const { externalRef } = webhook.payload;

    const transaction = await db('transactions').where({ external_ref: externalRef }).first();
    if (!transaction) {
      throw new Error(`Transaction not found for ref: ${externalRef}`);
    }

    await db('transactions').where({ id: transaction.id }).update({
      status: 'FAILED',
      updated_at: new Date(),
    });

    // Update order status if linked
    if (transaction.order_id) {
      await db('orders').where({ id: transaction.order_id }).update({
        status: 'FAILED',
        updated_at: new Date(),
      });
    }

    return { status: 'payment_failed', transactionId: transaction.id };
  }

  /**
   * Handle chargeback filed webhook
   */
  static async handleChargebackFiled(webhook) {
    const { externalRef, amountCents, reason, disputeId } = webhook.payload;

    const transaction = await db('transactions').where({ external_ref: externalRef }).first();
    if (!transaction) {
      throw new Error(`Transaction not found for ref: ${externalRef}`);
    }

    // Create dispute record
    const order = await db('orders').where({ id: transaction.order_id }).first();
    const merchant = order ? await db('merchant_stores').where({ tenant_id: order.tenant_id }).first() : null;

    const dispute = await db('payment_disputes').insert({
      tenant_id: transaction.tenant_id,
      transaction_id: transaction.id,
      order_id: transaction.order_id,
      dispute_type: 'chargeback',
      status: 'open',
      dispute_amount: amountCents / 100,
      reason: reason || 'Customer initiated chargeback',
      merchant_id: merchant?.id,
      customer_id: order?.user_id,
      external_dispute_id: disputeId,
      dispute_date: new Date(),
    }).returning('*');

    return { status: 'chargeback_created', disputeId: dispute[0]?.id };
  }

  /**
   * Get dead letter queue (failed webhooks)
   */
  static async getDeadLetterQueue(tenantId, limit = 50) {
    return db('webhook_queue')
      .where({ tenant_id: tenantId, status: 'failed' })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Retry a failed webhook manually
   */
  static async retryWebhook(webhookId) {
    const webhook = await db('webhook_queue').where({ id: webhookId }).first();
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    await db('webhook_queue').where({ id: webhookId }).update({
      status: 'pending',
      retry_count: 0,
      next_retry_at: new Date(),
      error_message: null,
      updated_at: new Date(),
    });

    return { success: true, message: 'Webhook queued for retry' };
  }

  /**
   * Get webhook queue status (for admin dashboard)
   */
  static async getQueueStatus(tenantId) {
    const stats = await db('webhook_queue')
      .where({ tenant_id: tenantId })
      .select('status')
      .count('* as count')
      .groupBy('status');

    return stats.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
  }
}

export default WebhookQueueService;
