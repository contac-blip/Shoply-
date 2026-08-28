import {
  buildMerchantDashboard,
  summarizeSalesByStore,
  summarizeInventoryHealth,
} from '../src_js/analytics/merchantDashboardService.js';
import {
  scheduleMerchantSummaryJob,
  materializeMerchantSummarySnapshot,
  persistMerchantSummarySnapshot,
} from '../src_js/platform/platformOperationsService.js';
import { startMerchantSummaryScheduler } from '../src_js/scheduler/merchantSummaryScheduler.js';

describe('merchant dashboard analytics', () => {
  test('builds a merchant dashboard summary', () => {
    const dashboard = buildMerchantDashboard({
      totalRevenue: 2500,
      totalOrders: 18,
      pendingFulfillment: 3,
      lowStockItems: 5,
      returnRate: 0.08,
    });

    expect(dashboard.totalRevenue).toBe(2500);
    expect(dashboard.totalOrders).toBe(18);
    expect(dashboard.pendingFulfillment).toBe(3);
    expect(dashboard.lowStockItems).toBe(5);
  });

  test('summarizes sales by store', () => {
    const summary = summarizeSalesByStore([
      { tenant_id: 't1', total_amount: 1000 },
      { tenant_id: 't1', total_amount: 1500 },
      { tenant_id: 't2', total_amount: 800 },
    ]);

    expect(summary).toEqual(expect.arrayContaining([
      expect.objectContaining({ tenant_id: 't1', totalRevenue: 2500 }),
      expect.objectContaining({ tenant_id: 't2', totalRevenue: 800 }),
    ]));
  });

  test('summarizes inventory health', () => {
    const summary = summarizeInventoryHealth([
      { available_quantity: 12, reorder_level: 6 },
      { available_quantity: 4, reorder_level: 8 },
      { available_quantity: 0, reorder_level: 5 },
    ]);

    expect(summary.healthy).toBe(1);
    expect(summary.lowStock).toBe(1);
    expect(summary.outOfStock).toBe(1);
  });

  test('schedules and materializes a merchant summary snapshot', () => {
    const job = scheduleMerchantSummaryJob({ tenantId: 'tenant-1', intervalMs: 60000, enabled: true });
    const snapshot = materializeMerchantSummarySnapshot({
      tenantId: 'tenant-1',
      orders: [
        { status: 'paid', total_amount: 240 },
        { status: 'packed', total_amount: 110 },
      ],
      stockLevels: [
        { available_quantity: 4, reorder_level: 6 },
        { available_quantity: 12, reorder_level: 10 },
      ],
      returnRequests: [{ id: 'r1' }],
    });

    expect(job.enabled).toBe(true);
    expect(job.intervalMs).toBe(60000);
    expect(snapshot.tenantId).toBe('tenant-1');
    expect(snapshot.totalRevenue).toBe(350);
    expect(snapshot.pendingFulfillment).toBe(1);
    expect(snapshot.lowStockItems).toBe(1);
  });

  test('persists a merchant summary snapshot to the dashboard table', async () => {
    const fakeDb = {
      schema: { hasTable: async () => true },
      merchant_dashboard_summary: () => ({
        insert: async () => [{
          id: 'summary-1',
          tenant_id: 'tenant-1',
          total_revenue: 350,
          total_orders: 2,
          pending_fulfillment: 1,
          low_stock_items: 1,
          return_rate: 0.5,
        }],
      }),
    };

    const result = await persistMerchantSummarySnapshot(fakeDb, {
      tenantId: 'tenant-1',
      orders: [
        { status: 'paid', total_amount: 240 },
        { status: 'packed', total_amount: 110 },
      ],
      stockLevels: [
        { available_quantity: 4, reorder_level: 6 },
        { available_quantity: 12, reorder_level: 10 },
      ],
      returnRequests: [{ id: 'r1' }],
    });

    expect(result.persisted).toBe(true);
    expect(result.totalRevenue).toBe(350);
    expect(result.tenantId).toBe('tenant-1');
  });

  test('prevents overlapping merchant summary job executions and exposes shutdown', async () => {
    let runCount = 0;
    const scheduler = startMerchantSummaryScheduler({
      db: {
        schema: { hasTable: async () => true },
        merchant_dashboard_summary: () => ({
          insert: async () => {
            runCount += 1;
            return [{ id: 'summary-1' }];
          },
        }),
      },
      intervalMs: 100,
      loadMetrics: async () => ({
        orders: [{ status: 'paid', total_amount: 100 }],
        stockLevels: [{ available_quantity: 5, reorder_level: 10 }],
        returnRequests: [],
      }),
    });

    await Promise.all([
      scheduler.executeJob(),
      scheduler.executeJob(),
    ]);
    const stopped = scheduler.stop();

    expect(runCount).toBe(1);
    expect(stopped).toBe(true);
  });
});
