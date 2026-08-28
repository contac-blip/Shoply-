import { buildMerchantReportingSummary } from '../src_js/reporting/merchantReportingService.js';

describe('merchant reporting service', () => {
  test('builds the final dashboard reporting summary', () => {
    const summary = buildMerchantReportingSummary({
      orders: [
        { status: 'paid', total_amount: 300 },
        { status: 'packed', total_amount: 120 },
        { status: 'cancelled', total_amount: 40 },
      ],
      currentSummary: { totalRevenue: 300, totalOrders: 3 },
      returnRequests: [{ id: 'r1' }, { id: 'r2' }],
      fraudFlags: [{ is_resolved: false }, { is_resolved: true }],
      supportTickets: [{ status: 'open' }, { status: 'closed' }],
    });

    expect(summary.totalRevenue).toBe(460);
    expect(summary.totalOrders).toBe(3);
    expect(summary.pendingFulfillment).toBe(1);
    expect(summary.returnRate).toBeCloseTo(0.67, 2);
    expect(summary.openTickets).toBe(1);
    expect(summary.flaggedOrders).toBe(1);
  });
});
