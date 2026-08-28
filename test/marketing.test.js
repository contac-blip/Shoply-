import {
  calculateDiscount,
  validatePromoCode,
  applyCampaignRules,
} from '../src_js/marketing/marketingService.js';

describe('marketing promotion engine', () => {
  test('calculates percentage discount correctly', () => {
    const result = calculateDiscount(2000, 10);
    expect(result.discountAmount).toBe(200);
    expect(result.finalAmount).toBe(1800);
  });

  test('validates an active promo code', () => {
    const result = validatePromoCode({
      code: 'SAVE10',
      active: true,
      startDate: '2025-01-01',
      endDate: '2030-01-01',
      usageLimit: 100,
      usageCount: 5,
      minimumOrderAmount: 1000,
      orderTotal: 1500,
    });

    expect(result.valid).toBe(true);
    expect(result.discountType).toBe('percentage');
  });

  test('rejects expired or invalid promo code', () => {
    const result = validatePromoCode({
      code: 'EXPIRED',
      active: true,
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      usageLimit: 10,
      usageCount: 10,
      minimumOrderAmount: 1000,
      orderTotal: 1500,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired|usage|minimum/i);
  });

  test('applies campaign rules appropriately', () => {
    const result = applyCampaignRules({
      campaignType: 'flash_sale',
      discountPercent: 15,
      orderTotal: 5000,
      isEligible: true,
    });

    expect(result.applied).toBe(true);
    expect(result.discountAmount).toBe(750);
  });
});
