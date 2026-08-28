import db from '../config/db.js';
import {
  validatePromoCode,
  calculateDiscount,
  applyCampaignRules,
} from '../src_js/marketing/marketingService.js';

export const validatePromo = async (req, res) => {
  try {
    const { code, orderTotal = 0 } = req.body;
    const promo = await db('promo_codes').where({ code }).first();

    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    const validation = validatePromoCode({
      code: promo.code,
      active: promo.active,
      startDate: promo.start_date,
      endDate: promo.end_date,
      usageLimit: promo.usage_limit,
      usageCount: promo.usage_count,
      minimumOrderAmount: promo.minimum_order_amount,
      orderTotal,
      discountType: promo.discount_type,
      discountPercent: promo.discount_percent,
    });

    return res.json(validation);
  } catch (error) {
    console.error('Promo validation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const applyPromo = async (req, res) => {
  try {
    const { code, orderTotal = 0 } = req.body;
    const promo = await db('promo_codes').where({ code }).first();

    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    const validation = validatePromoCode({
      code: promo.code,
      active: promo.active,
      startDate: promo.start_date,
      endDate: promo.end_date,
      usageLimit: promo.usage_limit,
      usageCount: promo.usage_count,
      minimumOrderAmount: promo.minimum_order_amount,
      orderTotal,
      discountType: promo.discount_type,
      discountPercent: promo.discount_percent,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.reason, ...validation });
    }

    const discount = calculateDiscount(orderTotal, promo.discount_percent || 0);

    return res.json({
      message: 'Promo applied successfully',
      ...validation,
      ...discount,
    });
  } catch (error) {
    console.error('Promo application failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const applyCampaign = async (req, res) => {
  try {
    const { campaignType, discountPercent = 0, orderTotal = 0, isEligible = true } = req.body;

    const result = applyCampaignRules({
      campaignType,
      discountPercent,
      orderTotal,
      isEligible,
    });

    return res.json(result);
  } catch (error) {
    console.error('Campaign application failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
