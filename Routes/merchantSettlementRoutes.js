import express from 'express';
import { auth, authorize } from '../Auth/auth.js';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import ensureMerchantForStore from '../src_js/middleware/ensureMerchantForStore.js';
import {
  getMerchantBalance,
  createMerchantSettlement,
  getMerchantPayoutDestination,
  saveMerchantPayoutDestination,
} from '../Controllers/merchantSettlementController.js';

const router = express.Router();

router.use(auth);
router.use(authorize('merchant', 'admin'));
router.use(tenantMiddleware);
router.use(ensureMerchantForStore);

router.get('/balance', getMerchantBalance);
router.post('/', createMerchantSettlement);
router.get('/payout-destination', getMerchantPayoutDestination);
router.post('/payout-destination', saveMerchantPayoutDestination);

export default router;
