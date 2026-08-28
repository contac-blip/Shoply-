import db from '../config/db.js';
import { calculatePromoDiscount, normalizePromoPayload, getCampaignStatus } from '../src_js/marketing/promoCampaignService.js';

export const createPromoCode = async (req, res) => {
  try {
    const payload = normalizePromoPayload(req.body);

    if (!payload.code) {
      return res.status(400).json({ message: 'Promo code is required' });
    }

    const existing = await db('promo_codes').where({ code: payload.code }).first();
    if (existing) {
      return res.status(409).json({ message: 'Promo code already exists' });
    }

    const [promo] = await db('promo_codes').insert(payload).returning('*');

    return res.status(201).json({ message: 'Promo code created', promo });
  } catch (error) {
    console.error('Create promo failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listPromoCodes = async (req, res) => {
  try {
    const promos = await db('promo_codes').orderBy('created_at', 'desc');
    return res.json(promos);
  } catch (error) {
    console.error('List promos failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, type = 'flash_sale', status = 'draft', discount_percent = 0, start_at, end_at } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Campaign name is required' });
    }

    const payload = {
      name,
      type,
      status,
      discount_percent: Number(discount_percent || 0),
      start_at: start_at || null,
      end_at: end_at || null,
    };

    const [campaign] = await db('campaigns').insert(payload).returning('*');
    return res.status(201).json({ message: 'Campaign created', campaign, statusInfo: getCampaignStatus(payload) });
  } catch (error) {
    console.error('Create campaign failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const computePromoDiscount = async (req, res) => {
  try {
    const { type, value, orderTotal } = req.body;
    const result = calculatePromoDiscount({ type, value, orderTotal });
    return res.json(result);
  } catch (error) {
    console.error('Compute promo discount failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
