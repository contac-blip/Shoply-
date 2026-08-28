import {
  summarizeSales,
  summarizeTopProducts,
  summarizeMerchantPerformance,
} from '../src_js/analytics/analyticsService.js';

describe('analytics summarization', () => {
  test('summarizes total sales and order counts', () => {
    const summary = summarizeSales([
      { total_amount: 100, status: 'paid' },
      { total_amount: 200, status: 'paid' },
      { total_amount: 50, status: 'cancelled' },
    ]);

    expect(summary.totalRevenue).toBe(300);
    expect(summary.totalOrders).toBe(2);
    expect(summary.averageOrderValue).toBe(150);
  });

  test('returns most sold products by quantity', () => {
    const topProducts = summarizeTopProducts([
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p1', quantity: 3 },
      { product_id: 'p2', quantity: 5 },
    ]);

    expect(topProducts[0]).toMatchObject({ product_id: 'p2', totalQuantity: 5 });
  });

  test('summarizes merchant performance by store', () => {
    const performance = summarizeMerchantPerformance([
      { tenant_id: 't1', total_amount: 250, status: 'paid' },
      { tenant_id: 't1', total_amount: 150, status: 'paid' },
      { tenant_id: 't2', total_amount: 300, status: 'paid' },
    ]);

    expect(performance).toEqual(expect.arrayContaining([
      expect.objectContaining({ tenant_id: 't1', totalRevenue: 400 }),
      expect.objectContaining({ tenant_id: 't2', totalRevenue: 300 }),
    ]));
  });
});
