import { generateInvoice, reconcilePayout, summarizeSettlementLedger } from '../src_js/billing/reconciliationService.js';

export const createInvoice = async (req, res) => {
  try {
    const { tenant_id, order_id, amount = 0, status = 'draft', issued_at } = req.body;

    const invoice = generateInvoice({
      tenantId: tenant_id,
      orderId: order_id,
      amount,
      status,
      issuedAt: issued_at || new Date().toISOString(),
    });

    return res.status(201).json({ message: 'Invoice generated', invoice });
  } catch (error) {
    console.error('Invoice generation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createPayoutReconciliation = async (req, res) => {
  try {
    const { gross_sales = 0, commission_rate = 0, refund_amount = 0, processing_fees = 0 } = req.body;

    const reconciliation = reconcilePayout({
      grossSales: gross_sales,
      commissionRate: commission_rate,
      refundAmount: refund_amount,
      processingFees: processing_fees,
    });

    return res.json({ message: 'Payout reconciled', reconciliation });
  } catch (error) {
    console.error('Payout reconciliation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listSettlementSummary = async (req, res) => {
  try {
    const { entries = [] } = req.body;
    const summary = summarizeSettlementLedger(entries);

    return res.json({ summary });
  } catch (error) {
    console.error('Settlement summary failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
