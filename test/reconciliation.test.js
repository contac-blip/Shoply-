import {
  generateInvoice,
  reconcilePayout,
  summarizeSettlementLedger,
  persistInvoiceRecord,
  persistSettlementRecord,
  recordOrderLoyaltyRedemption,
  reconcilePaymentLedger,
} from '../src_js/billing/reconciliationService.js';

describe('reconciliation services', () => {
  test('generates an invoice payload', () => {
    const invoice = generateInvoice({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      amount: 1200,
      status: 'draft',
    });

    expect(invoice.amount).toBe(1200);
    expect(invoice.status).toBe('draft');
    expect(invoice.tenantId).toBe('tenant-1');
  });

  test('reconciles a payout amount', () => {
    const payout = reconcilePayout({
      grossSales: 3000,
      commissionRate: 10,
      refundAmount: 200,
      processingFees: 50,
    });

    expect(payout.commissionAmount).toBe(300);
    expect(payout.netRevenue).toBe(2750);
    expect(payout.payoutAmount).toBe(2450);
    expect(payout.status).toBe('ready_for_settlement');
  });

  test('summarizes settlement ledger totals', () => {
    const summary = summarizeSettlementLedger([
      { amount: 1000, status: 'pending' },
      { amount: 500, status: 'settled' },
      { amount: 200, status: 'pending' },
    ]);

    expect(summary.totalAmount).toBe(1700);
    expect(summary.pendingAmount).toBe(1200);
    expect(summary.settledAmount).toBe(500);
  });

  test('persists an invoice and settlement record for a completed order', async () => {
    const fakeDb = {
      schema: { hasTable: async () => true },
      invoices: async (table) => ({
        insert: async () => [{
          id: 'invoice-1',
          tenant_id: 'tenant-1',
          order_id: 'order-1',
          amount: 1200,
          status: 'issued',
        }],
      }),
      settlements: async (table) => ({
        insert: async () => [{
          id: 'settlement-1',
          tenant_id: 'tenant-1',
          amount: 1100,
          status: 'pending',
        }],
      }),
    };

    const invoice = await persistInvoiceRecord(fakeDb, {
      tenantId: 'tenant-1',
      orderId: 'order-1',
      amount: 1200,
      status: 'issued',
    });

    const settlement = await persistSettlementRecord(fakeDb, {
      tenantId: 'tenant-1',
      amount: 1100,
      status: 'pending',
    });

    expect(invoice.persisted).toBe(true);
    expect(settlement.persisted).toBe(true);
    expect(settlement.amount).toBe(1100);
  });

  test('records loyalty redemption against an order completion', async () => {
    const fakeDb = {
      schema: { hasTable: async () => true },
      loyalty_redemptions: async () => ({
        insert: async () => [{
          id: 'loyalty-1',
          order_id: 'order-1',
          user_id: 'user-1',
          points_used: 40,
          discount_amount: 80,
          status: 'recorded',
        }],
      }),
    };

    const result = await recordOrderLoyaltyRedemption(fakeDb, {
      userId: 'user-1',
      orderId: 'order-1',
      pointsUsed: 40,
      discountAmount: 80,
      orderTotal: 500,
      status: 'recorded',
    });

    expect(result.persisted).toBe(true);
    expect(result.pointsUsed).toBe(40);
    expect(result.status).toBe('recorded');
  });

  test('reconciles payment ledger totals for production flows', () => {
    const result = reconcilePaymentLedger({
      capturedAmount: 1000,
      creditedAmount: 1000,
      refundedAmount: 100,
      fees: 30,
    });

    expect(result.status).toBe('reconciled');
    expect(result.mismatch).toBe(false);
    expect(result.netSettlement).toBe(870);
  });
});
