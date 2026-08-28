import express from 'express';
import { auth, authorize } from '../Auth/auth.js';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import { getMerchantProfile, upsertMerchantProfile } from '../Controllers/merchantProfileController.js';

const router = express.Router();

router.use(auth);
router.use(authorize('merchant', 'admin'));
router.use(tenantMiddleware);

router.get('/', getMerchantProfile);
router.post('/', upsertMerchantProfile);
router.put('/', upsertMerchantProfile);

export default router;
