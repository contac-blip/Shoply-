import { calculateCommission, summarizeCommissionLedger } from '../src_js/billing/commissionService.js';

describe('commission service', () => {
  test('calculates commission from gross sales', () => {
    const result = calculateCommission({ grossSales: 1000, commissionRate: 12 });

    expect(result.commissionAmount).toBe(120);
    expect(result.netPayout).toBe(880);
  });

  test('summarizes commission ledger totals', () => {
    const summary = summarizeCommissionLedger([
      { gross_sales: 1000, commission_rate: 10 },
      { gross_sales: 500, commission_rate: 15 },
    ]);

    expect(summary.totalGrossSales).toBe(1500);
    expect(summary.totalCommission).toBe(175);
    expect(summary.totalNet).toBe(1325);
  });
});
