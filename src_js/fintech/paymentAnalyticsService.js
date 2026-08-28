import db from '../../config/db.js';

class PaymentAnalyticsService {
  /**
   * Calculate and cache analytics for a tenant
   */
  static async calculateAnalytics(tenantId) {
    try {
      // Total revenue and transaction stats
      const transactionStats = await db('transactions')
        .where({ tenant_id: tenantId })
        .select('status')
        .sum('amount_cents as total_amount')
        .count('* as count')
        .groupBy('status');

      let totalRevenue = 0;
      let successfulAmount = 0;
      let totalTransactions = 0;
      let successfulTransactions = 0;
      let failedTransactions = 0;

      for (const row of transactionStats) {
        const count = Number(row.count) || 0;
        const amount = Number(row.total_amount) || 0;

        totalTransactions += count;
        totalRevenue += amount / 100;

        if (row.status === 'COMPLETED') {
          successfulAmount += amount / 100;
          successfulTransactions += count;
        } else if (row.status === 'FAILED') {
          failedTransactions += count;
        }
      }

      // Refund statistics
      const refundStats = await db('transactions')
        .where({ tenant_id: tenantId, status: 'REFUNDED' })
        .sum('amount_cents as total')
        .first();

      const totalRefunds = Number(refundStats?.total || 0) / 100;

      // Chargeback statistics
      const chargebackStats = await db('payment_disputes')
        .where({ tenant_id: tenantId, dispute_type: 'chargeback' })
        .sum('dispute_amount as total')
        .count('* as count')
        .first();

      const totalChargebacks = Number(chargebackStats?.total || 0);
      const chargebackCount = Number(chargebackStats?.count || 0);

      // Payment provider fees and commissions. Since ledger_entries are transaction-based, estimate fee totals
      // from successful transaction amounts and platform split assumptions.
      const feeStats = await db('transactions')
        .where({ tenant_id: tenantId, status: 'COMPLETED' })
        .sum('amount_cents as total')
        .first();

      const totalCompletedAmount = Number(feeStats?.total || 0);
      const providerFees = totalCompletedAmount > 0 ? (totalCompletedAmount * 0.035) / 100 : 0;
      const platformCommission = totalCompletedAmount > 0 ? (totalCompletedAmount * 0.035) / 100 : 0;

      // Payment method breakdown based on orders.payment_method
      const methodStats = await db('transactions as t')
        .join('orders as o', 't.order_id', 'o.id')
        .where('t.tenant_id', tenantId)
        .select('o.payment_method as payment_method')
        .sum('t.amount_cents as amount')
        .count('* as count')
        .groupBy('o.payment_method');

      const paymentMethodBreakdown = {};
      for (const row of methodStats) {
        paymentMethodBreakdown[(row.payment_method || 'unknown')] = Number(row.amount || 0) / 100;
      }

      // Calculate rates
      const refundRate = totalTransactions > 0 ? (totalRefunds / totalRevenue) * 100 : 0;
      const chargebackRate = totalTransactions > 0 ? (chargebackCount / totalTransactions) * 100 : 0;

      // Upsert cache
      const analyticsData = {
        tenant_id: tenantId,
        total_revenue: totalRevenue,
        total_successful_payments: successfulAmount,
        total_transactions: totalTransactions,
        successful_transactions: successfulTransactions,
        failed_transactions: failedTransactions,
        total_refunds: totalRefunds,
        total_chargebacks: totalChargebacks,
        payment_provider_fees: providerFees,
        platform_commission: platformCommission,
        payment_method_breakdown: JSON.stringify(paymentMethodBreakdown),
        refund_rate: refundRate,
        chargeback_rate: chargebackRate,
        last_calculated_at: new Date(),
        updated_at: new Date(),
      };

      // Check if cache exists
      const existing = await db('payment_analytics_cache')
        .where({ tenant_id: tenantId })
        .first();

      if (existing) {
        await db('payment_analytics_cache')
          .where({ tenant_id: tenantId })
          .update(analyticsData);
      } else {
        analyticsData.created_at = new Date();
        await db('payment_analytics_cache').insert(analyticsData);
      }

      return analyticsData;
    } catch (err) {
      console.error('Failed to calculate analytics:', err);
      throw err;
    }
  }

  /**
   * Get cached analytics
   */
  static async getAnalytics(tenantId, forceRecalculate = false) {
    try {
      // Recalculate if forced or cache is older than 1 hour
      if (forceRecalculate) {
        return await this.calculateAnalytics(tenantId);
      }

      const cached = await db('payment_analytics_cache')
        .where({ tenant_id: tenantId })
        .first();

      if (!cached) {
        return await this.calculateAnalytics(tenantId);
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (cached.last_calculated_at < oneHourAgo) {
        return await this.calculateAnalytics(tenantId);
      }

      // Parse JSONB
      if (typeof cached.payment_method_breakdown === 'string') {
        cached.payment_method_breakdown = JSON.parse(cached.payment_method_breakdown);
      }

      return cached;
    } catch (err) {
      console.error('Failed to get analytics:', err);
      throw err;
    }
  }

  /**
   * Get time-series revenue data (daily/weekly/monthly)
   */
  static async getRevenueTimeSeries(tenantId, period = 'daily', daysBack = 30) {
    try {
      const dateFormat =
        period === 'daily'
          ? "DATE(created_at AT TIME ZONE 'UTC')"
          : period === 'weekly'
          ? "DATE_TRUNC('week', created_at AT TIME ZONE 'UTC')"
          : "DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')";

      const data = await db.raw(
        `SELECT 
          ${dateFormat} as period,
          SUM(CASE WHEN status = 'COMPLETED' THEN amount_cents ELSE 0 END) / 100.0 as revenue,
          COUNT(*) as transaction_count,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful_count
        FROM transactions
        WHERE tenant_id = ? AND created_at > now() - interval '${daysBack} days'
        GROUP BY ${dateFormat}
        ORDER BY period DESC`,
        [tenantId]
      );

      return data.rows || [];
    } catch (err) {
      console.error('Failed to get time series:', err);
      throw err;
    }
  }

  /**
   * Get top merchants by transaction volume
   */
  static async getTopMerchants(tenantId, limit = 10) {
    try {
      const data = await db('transactions as t')
        .join('orders as o', 't.order_id', 'o.id')
        .join('merchant_stores as m', 'o.tenant_id', 'm.tenant_id')
        .where('t.tenant_id', tenantId)
        .where('t.status', 'COMPLETED')
        .select('m.id', 'm.name')
        .sum('t.amount_cents as total_amount')
        .count('t.id as transaction_count')
        .groupBy('m.id', 'm.name')
        .orderBy('total_amount', 'desc')
        .limit(limit);

      return data.map((row) => ({
        ...row,
        total_amount: Number(row.total_amount || 0) / 100,
      }));
    } catch (err) {
      console.error('Failed to get top merchants:', err);
      throw err;
    }
  }

  /**
   * Get payment health score (0-100)
   * Based on: success rate, refund rate, chargeback rate
   */
  static async getHealthScore(tenantId) {
    try {
      const analytics = await this.getAnalytics(tenantId);

      let score = 100;

      // Deduct for failed transactions
      const failureRate = analytics.total_transactions > 0
        ? (analytics.failed_transactions / analytics.total_transactions) * 100
        : 0;
      score -= failureRate * 0.5; // Each 1% failure = -0.5 points

      // Deduct for refunds
      score -= Math.min(analytics.refund_rate * 0.5, 20); // Max -20 points

      // Deduct for chargebacks
      score -= Math.min(analytics.chargeback_rate * 2, 25); // Max -25 points

      return Math.max(0, Math.round(score));
    } catch (err) {
      console.error('Failed to calculate health score:', err);
      return 0;
    }
  }
}

export default PaymentAnalyticsService;
