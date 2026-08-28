import express from 'express';
import { auth, authorize } from '../Auth/auth.js';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import ensureMerchantForStore from '../src_js/middleware/ensureMerchantForStore.js';
import { getFulfillmentStatus, updateFulfillmentStatus } from '../Controllers/fulfillmentController.js';

const router = express.Router();

router.use(auth);
router.use(authorize('merchant', 'admin'));
router.use(tenantMiddleware);
router.use(ensureMerchantForStore);

router.get('/orders/:orderId', getFulfillmentStatus);
router.put('/orders/:orderId/status', updateFulfillmentStatus);

export default router;
