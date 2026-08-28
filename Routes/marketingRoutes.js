import express from 'express';
import { validatePromo, applyPromo, applyCampaign } from '../Controllers/marketingController.js';

const router = express.Router();

router.post('/promo/validate', validatePromo);
router.post('/promo/apply', applyPromo);
router.post('/campaign/apply', applyCampaign);

export default router;
