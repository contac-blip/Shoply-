import {
  calculatePromoDiscount,
  getCampaignStatus,
  normalizePromoPayload,
} from '../src_js/marketing/promoCampaignService.js';

describe('promo campaign helpers', () => {
  test('calculates a percentage discount correctly', () => {
    const result = calculatePromoDiscount({
      type: 'percentage',
      value: 10,
      orderTotal: 2000,
    });

    expect(result.discountAmount).toBe(200);
    expect(result.finalAmount).toBe(1800);
  });

  test('calculates a fixed discount correctly', () => {
    const result = calculatePromoDiscount({
      type: 'fixed',
      value: 250,
      orderTotal: 2000,
    });

    expect(result.discountAmount).toBe(250);
    expect(result.finalAmount).toBe(1750);
  });

  test('detects when a campaign is active', () => {
    const result = getCampaignStatus({
      status: 'active',
      start_at: '2025-01-01T00:00:00Z',
      end_at: '2030-01-01T00:00:00Z',
    });

    expect(result.isActive).toBe(true);
    expect(result.state).toBe('active');
  });

  test('normalizes promo payload for DB writes', () => {
    const result = normalizePromoPayload({
      code: 'SAVE25',
      type: 'percentage',
      value: '25',
      min_order_amount: '1500',
      is_active: true,
      usage_limit: '10',
    });

    expect(result.code).toBe('SAVE25');
    expect(result.type).toBe('percentage');
    expect(result.value).toBe(25);
    expect(result.min_order_amount).toBe(1500);
    expect(result.usage_limit).toBe(10);
  });
});
