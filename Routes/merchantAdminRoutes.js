import express from 'express';
import db from '../config/db.js';
import { auth, authorize } from '../Auth/auth.js';

const router = express.Router();

router.use(auth);
router.use(authorize('admin'));

router.get('/', async (req, res) => {
  try {
    const merchants = await db('merchants')
      .leftJoin('users', 'merchants.user_id', 'users.id')
      .select(
        'merchants.*',
        'users.email',
        'users.first_name',
        'users.last_name',
      )
      .orderBy('merchants.created_at', 'desc');
    return res.json(merchants);
  } catch (error) {
    console.error('Failed to load merchants:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:merchantId/status', async (req, res) => {
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (!['pending', 'approved', 'active', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid merchant status' });
  }

  try {
    const [merchant] = await db('merchants')
      .where({ merchant_id: req.params.merchantId })
      .update({ status, updated_at: db.fn.now() })
      .returning('*');
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    return res.json({ merchant });
  } catch (error) {
    console.error('Failed to update merchant status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
