import express from 'express';
import { getStats, getAdminOrders } from '../Controllers/adminController.js';
import { auth, authorize } from '../Auth/auth.js';

const router = express.Router();

router.use(auth);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/orders', getAdminOrders);

export default router;
