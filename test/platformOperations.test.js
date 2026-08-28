import {
  calculateRefundReversal,
  applyLoyaltyRedemption,
  materializeMerchantSummary,
  buildMerchantSummaryFromOperations,
} from '../src_js/platform/platformOperationsService.js';

describe('platform operations services', () => {
  test('calculates a refund reversal amount', () => {
    const result = calculateRefundReversal({
      orderTotal: 3000,
      refundPercent: 20,
      returnedAmount: 600,
    });

    expect(result.refundAmount).toBe(600);
    expect(result.reversalStatus).toBe('queued');
  });

  test('applies loyalty redemption correctly', () => {
    const result = applyLoyaltyRedemption({
      pointsBalance: 150,
      pointsUsed: 50,
      conversionRate: 1,
      orderTotal: 1500,
    });

    expect(result.discountAmount).toBe(50);
    expect(result.remainingPoints).toBe(100);
    expect(result.applied).toBe(true);
  });

  test('materializes a merchant summary', () => {
    const result = materializeMerchantSummary({
      totalRevenue: 5000,
      totalOrders: 30,
      pendingFulfillment: 4,
      lowStockItems: 2,
      returnRate: 0.12,
    });

    expect(result.totalRevenue).toBe(5000);
    expect(result.pendingFulfillment).toBe(4);
    expect(result.returnRate).toBe(0.12);
  });

  test('computes post-discount final total for checkout loyalty redemption', () => {
    const result = applyLoyaltyRedemption({
      pointsBalance: 120,
      pointsUsed: 40,
      conversionRate: 2,
      orderTotal: 500,
    });

    expect(result.discountAmount).toBe(80);
    expect(result.orderTotalAfterDiscount).toBe(420);
    expect(result.applied).toBe(true);
  });

  test('builds a merchant summary from order and stock data', () => {
    const result = buildMerchantSummaryFromOperations({
      orders: [
        { status: 'paid', total_amount: 200 },
        { status: 'packed', total_amount: 150 },
        { status: 'paid', total_amount: 100 },
      ],
      stockLevels: [
        { available_quantity: 8, reorder_level: 10 },
        { available_quantity: 3, reorder_level: 8 },
        { available_quantity: 15, reorder_level: 7 },
      ],
      returnRequests: [{ id: 'r1' }, { id: 'r2' }],
    });

    expect(result.totalRevenue).toBe(450);
    expect(result.totalOrders).toBe(3);
    expect(result.pendingFulfillment).toBe(1);
    expect(result.lowStockItems).toBe(2);
    expect(result.returnRate).toBeCloseTo(0.67, 2);
  });
});
