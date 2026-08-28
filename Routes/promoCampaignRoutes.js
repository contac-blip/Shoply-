import express from 'express';
import { createPromoCode, listPromoCodes, createCampaign, computePromoDiscount } from '../Controllers/promoCampaignController.js';

const router = express.Router();

router.get('/promo-codes', listPromoCodes);
router.post('/promo-codes', createPromoCode);
router.post('/campaigns', createCampaign);
router.post('/discount/calculate', computePromoDiscount);

export default router;
