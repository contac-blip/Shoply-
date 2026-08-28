import db from '../../config/db.js';

class DisputeService {
  /**
   * Create a new dispute
   */
  static async createDispute({
    tenantId,
    transactionId,
    orderId,
    disputeType,
    amount,
    reason,
    merchantId,
    customerId,
    externalDisputeId,
  }) {
    const dispute = await db('payment_disputes').insert({
      tenant_id: tenantId,
      transaction_id: transactionId,
      order_id: orderId,
      dispute_type: disputeType,
      status: 'open',
      dispute_amount: amount,
      reason,
      merchant_id: merchantId,
      customer_id: customerId,
      external_dispute_id: externalDisputeId,
      dispute_date: new Date(),
    }).returning('*');

    return dispute[0];
  }

  /**
   * List disputes for a tenant
   */
  static async listDisputes(tenantId, filters = {}) {
    let query = db('payment_disputes');

    if (tenantId) {
      query = query.where({ tenant_id: tenantId });
    }

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.merchantId) {
      query = query.where({ merchant_id: filters.merchantId });
    }

    if (filters.disputeType) {
      query = query.where({ dispute_type: filters.disputeType });
    }

    if (filters.minAmount) {
      query = query.where('dispute_amount', '>=', filters.minAmount);
    }

    return query.orderBy('dispute_date', 'desc').limit(100);
  }

  /**
   * Get dispute details
   */
  static async getDispute(disputeId, tenantId) {
    const dispute = await db('payment_disputes')
      .where({ id: disputeId, tenant_id: tenantId })
      .first();

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    return dispute;
  }

  /**
   * Update dispute status
   */
  static async updateDisputeStatus(disputeId, tenantId, newStatus, details = {}) {
    const validStatuses = ['open', 'investigation', 'resolved', 'lost'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    let disputeQuery = db('payment_disputes').where({ id: disputeId });
    if (tenantId) {
      disputeQuery = disputeQuery.where({ tenant_id: tenantId });
    }

    const dispute = await disputeQuery.first();

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const updates = {
      status: newStatus,
      updated_at: new Date(),
    };

    if (newStatus === 'resolved') {
      updates.resolution_date = new Date();
      updates.resolution_details = details.resolution_details;
      updates.settlement_amount = details.settlement_amount || dispute.dispute_amount;

      // If dispute lost, reverse the chargeback from merchant account
      if (details.settlement_amount > 0) {
        await this.recordChargebackReversal(
          dispute.tenant_id,
          dispute.merchant_id,
          details.settlement_amount,
          disputeId
        );
      }
    }

    const updated = await db('payment_disputes')
      .where({ id: disputeId })
      .update(updates)
      .returning('*');

    return updated[0];
  }

  /**
   * Submit evidence for dispute
   */
  static async submitEvidence(disputeId, tenantId, evidenceData) {
    let disputeQuery = db('payment_disputes').where({ id: disputeId });
    if (tenantId) {
      disputeQuery = disputeQuery.where({ tenant_id: tenantId });
    }

    const dispute = await disputeQuery.first();

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status !== 'open' && dispute.status !== 'investigation') {
      throw new Error('Cannot submit evidence for a closed dispute');
    }

    const updated = await db('payment_disputes')
      .where({ id: disputeId })
      .update({
        evidence: evidenceData,
        status: 'investigation',
        updated_at: new Date(),
      })
      .returning('*');

    return updated[0];
  }

  /**
   * Record chargeback reversal in merchant balance ledger
   */
  static async recordChargebackReversal(tenantId, merchantId, amount, disputeId) {
    try {
      const entry = {
        merchant_id: merchantId,
        tenant_id: tenantId,
        entry_type: 'chargeback_reversal',
        gross_amount: 0,
        net_amount: amount,
        pending_balance_delta: 0,
        available_balance_delta: Number(amount),
        paid_out_amount_delta: 0,
        reserved_amount_delta: 0,
        refund_adjustment_delta: 0,
        notes: `Chargeback reversal for dispute ${disputeId}`,
      };

      await db('merchant_balance_ledger').insert(entry);

      const openSettlement = await db('merchant_settlement_runs')
        .where({ merchant_id: merchantId, status: 'ELIGIBLE' })
        .first();

      if (openSettlement) {
        await db('merchant_settlement_runs')
          .where({ id: openSettlement.id })
          .update({
            amount: db.raw(`amount - ?`, [amount]),
            updated_at: new Date(),
          });
      }
    } catch (err) {
      console.error('Failed to record chargeback reversal:', err);
    }
  }

  /**
   * Get dispute statistics for tenant
   */
  static async getDisputeStats(tenantId) {
    const stats = await db('payment_disputes')
      .where({ tenant_id: tenantId })
      .select('status')
      .sum('dispute_amount as amount')
      .count('* as count')
      .groupBy('status');

    const totalByType = await db('payment_disputes')
      .where({ tenant_id: tenantId })
      .select('dispute_type')
      .count('* as count')
      .sum('dispute_amount as amount')
      .groupBy('dispute_type');

    return {
      byStatus: stats.reduce((acc, row) => {
        acc[row.status] = { count: row.count, amount: row.amount };
        return acc;
      }, {}),
      byType: totalByType.reduce((acc, row) => {
        acc[row.dispute_type] = { count: row.count, amount: row.amount };
        return acc;
      }, {}),
    };
  }
}

export default DisputeService;
