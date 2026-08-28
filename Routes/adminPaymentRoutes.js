import express from 'express';
import { auth, authorize } from '../Auth/auth.js';
import db from '../config/db.js';
import WebhookQueueService from '../src_js/fintech/webhookQueueService.js';
import DisputeService from '../src_js/fintech/disputeService.js';
import PaymentAnalyticsService from '../src_js/fintech/paymentAnalyticsService.js';

const router = express.Router();
router.use(auth);
router.use(authorize('admin'));

// ==================== PAYMENT RECONCILIATION ====================

/**
 * GET /admin/payments/transactions
 * List all transactions with status, amounts, dates
 */
router.get('/transactions', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = db('transactions');

    if (status) {
      query = query.where({ status });
    }

    const total = await query.count('* as count').first();
    const transactions = await query
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    return res.json({
      transactions,
      total: total?.count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    console.error('Failed to list transactions:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /admin/payments/transactions/:transactionId
 * Get transaction details
 */
router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const transaction = await db('transactions')
      .where({ id: req.params.transactionId })
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get related order if exists
    const order = transaction.order_id
      ? await db('orders').where({ id: transaction.order_id }).first()
      : null;

    // Get ledger entries
    const ledgerEntries = await db('ledger_entries')
      .where({ transaction_id: transaction.id });

    return res.json({ transaction, order, ledgerEntries });
  } catch (err) {
    console.error('Failed to get transaction:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * PATCH /admin/payments/transactions/:transactionId/reconcile
 * Manually mark a transaction as reconciled
 */
router.patch('/transactions/:transactionId/reconcile', async (req, res) => {
  try {
    const { notes } = req.body;
    const transaction = await db('transactions')
      .where({ id: req.params.transactionId })
      .update({
        status: 'RECONCILED',
        notes: notes || 'Manually reconciled by admin',
        updated_at: new Date(),
      })
      .returning('*');

    return res.json({ message: 'Transaction reconciled', transaction: transaction[0] });
  } catch (err) {
    console.error('Failed to reconcile transaction:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// ==================== WEBHOOK QUEUE & RETRY ====================

/**
 * GET /admin/payments/webhooks/queue
 * Get webhook queue status
 */
router.get('/webhooks/queue', async (req, res) => {
  try {
    const { tenantId = null, limit = 50 } = req.query;

    let query = db('webhook_queue');

    if (tenantId) {
      query = query.where({ tenant_id: tenantId });
    }

    const deadLetters = await query
      .where({ status: 'failed' })
      .orderBy('created_at', 'desc')
      .limit(Number(limit));

    const pending = await query
      .where({ status: 'pending' })
      .count('* as count')
      .first();

    const processing = await query
      .where({ status: 'processing' })
      .count('* as count')
      .first();

    const completed = await query
      .where({ status: 'completed' })
      .count('* as count')
      .first();

    return res.json({
      deadLetters,
      stats: {
        pending: pending?.count,
        processing: processing?.count,
        completed: completed?.count,
        failed: deadLetters.length,
      },
    });
  } catch (err) {
    console.error('Failed to get webhook queue:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /admin/payments/webhooks/:webhookId/retry
 * Manually retry a failed webhook
 */
router.post('/webhooks/:webhookId/retry', async (req, res) => {
  try {
    const result = await WebhookQueueService.retryWebhook(req.params.webhookId);
    return res.json(result);
  } catch (err) {
    console.error('Failed to retry webhook:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /admin/payments/webhooks/process
 * Manually trigger webhook processing
 */
router.post('/webhooks/process', async (req, res) => {
  try {
    const result = await WebhookQueueService.processPendingWebhooks();
    return res.json(result);
  } catch (err) {
    console.error('Failed to process webhooks:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// ==================== PAYMENT DISPUTES & CHARGEBACKS ====================

/**
 * GET /admin/payments/disputes
 * List all disputes
 */
router.get('/disputes', async (req, res) => {
  try {
    const { status, disputeType, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (disputeType) filters.disputeType = disputeType;

    const disputes = await DisputeService.listDisputes(null, { ...filters });
    const total = disputes.length;
    const paginated = disputes.slice(Number(offset), Number(offset) + Number(limit));

    return res.json({
      disputes: paginated,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    console.error('Failed to list disputes:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /admin/payments/disputes/:disputeId
 * Get dispute details
 */
router.get('/disputes/:disputeId', async (req, res) => {
  try {
    const dispute = await db('payment_disputes')
      .where({ id: req.params.disputeId })
      .first();

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Get related transaction and order
    const transaction = dispute.transaction_id
      ? await db('transactions').where({ id: dispute.transaction_id }).first()
      : null;

    const order = dispute.order_id
      ? await db('orders').where({ id: dispute.order_id }).first()
      : null;

    return res.json({ dispute, transaction, order });
  } catch (err) {
    console.error('Failed to get dispute:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * PATCH /admin/payments/disputes/:disputeId/status
 * Update dispute status and resolution
 */
router.patch('/disputes/:disputeId/status', async (req, res) => {
  try {
    const { status, resolutionDetails, settlementAmount } = req.body;

    if (!['open', 'investigation', 'resolved', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'Invalid dispute status' });
    }

    const updated = await DisputeService.updateDisputeStatus(
      req.params.disputeId,
      null, // tenantId not required for admin
      status,
      { resolution_details: resolutionDetails, settlement_amount: settlementAmount }
    );

    return res.json({ message: 'Dispute updated', dispute: updated });
  } catch (err) {
    console.error('Failed to update dispute:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /admin/payments/disputes/:disputeId/evidence
 * Submit evidence for dispute
 */
router.post('/disputes/:disputeId/evidence', async (req, res) => {
  try {
    const { evidence } = req.body;

    const updated = await DisputeService.submitEvidence(
      req.params.disputeId,
      null, // tenantId not required for admin
      evidence
    );

    return res.json({ message: 'Evidence submitted', dispute: updated });
  } catch (err) {
    console.error('Failed to submit evidence:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// ==================== PAYMENT ANALYTICS ====================

/**
 * GET /admin/payments/analytics
 * Get payment analytics and metrics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { forceRecalculate = false, tenantId = null } = req.query;

    // For admin, fetch all if no tenantId specified
    if (!tenantId) {
      // Return platform-wide analytics
      const allAnalytics = await db('payment_analytics_cache');
      const aggregated = {
        total_revenue: allAnalytics.reduce((sum, a) => sum + Number(a.total_revenue || 0), 0),
        total_transactions: allAnalytics.reduce((sum, a) => sum + Number(a.total_transactions || 0), 0),
        successful_transactions: allAnalytics.reduce((sum, a) => sum + Number(a.successful_transactions || 0), 0),
        failed_transactions: allAnalytics.reduce((sum, a) => sum + Number(a.failed_transactions || 0), 0),
        total_refunds: allAnalytics.reduce((sum, a) => sum + Number(a.total_refunds || 0), 0),
        total_chargebacks: allAnalytics.reduce((sum, a) => sum + Number(a.total_chargebacks || 0), 0),
        average_health_score: 0,
      };

      return res.json({ analytics: aggregated, byTenant: allAnalytics });
    }

    const analytics = await PaymentAnalyticsService.getAnalytics(tenantId, forceRecalculate);
    const healthScore = await PaymentAnalyticsService.getHealthScore(tenantId);

    return res.json({ analytics, healthScore });
  } catch (err) {
    console.error('Failed to get analytics:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /admin/payments/analytics/revenue
 * Get revenue time-series data
 */
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { tenantId, period = 'daily', daysBack = 30 } = req.query;

    const data = await PaymentAnalyticsService.getRevenueTimeSeries(
      tenantId,
      period,
      Number(daysBack)
    );

    return res.json({ data });
  } catch (err) {
    console.error('Failed to get revenue data:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /admin/payments/analytics/top-merchants
 * Get top merchants by transaction volume
 */
router.get('/analytics/top-merchants', async (req, res) => {
  try {
    const { tenantId, limit = 10 } = req.query;

    const merchants = await PaymentAnalyticsService.getTopMerchants(tenantId, Number(limit));

    return res.json({ merchants });
  } catch (err) {
    console.error('Failed to get top merchants:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
