import express from 'express';
import { auth, authorize } from '../Auth/auth.js';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import ensureMerchantForStore from '../src_js/middleware/ensureMerchantForStore.js';
import db from '../config/db.js';

const router = express.Router();

router.use(auth);
router.use(authorize('merchant', 'admin'));
router.use(tenantMiddleware);
router.use(ensureMerchantForStore);

router.get('/', async (req, res) => {
  try {
    const merchantId = req.body?.merchant_id || (req.user?.role === 'admin'
      ? null
      : (await db('merchants').where({ user_id: req.user.id }).first())?.merchant_id);

    if (!merchantId && req.user?.role !== 'admin') {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    const query = db('merchant_settlement_runs')
      .where(req.user?.role === 'admin' && req.query.merchant_id ? { merchant_id: req.query.merchant_id } : { merchant_id: merchantId })
      .orderBy('created_at', 'desc');

    if (req.tenantId) {
      query.where({ tenant_id: req.tenantId });
    }

    const settlements = await query;
    return res.json(settlements);
  } catch (error) {
    console.error('Failed to load merchant settlement history:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
