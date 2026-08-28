import express from 'express';
import {
  processRefundReversal,
  applyCustomerReward,
  materializeSummary,
} from '../Controllers/platformOperationsController.js';

const router = express.Router();

router.post('/refund/reversal', processRefundReversal);
router.post('/loyalty/redemptions', applyCustomerReward);
router.post('/merchant-summary/materialize', materializeSummary);

export default router;
