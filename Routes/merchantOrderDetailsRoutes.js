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

router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db('orders').where({ id: orderId, tenant_id: req.tenantId }).first();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const items = await db('order_items')
      .leftJoin('products', 'order_items.product_id', '=', 'products.id')
      .where({ order_id: orderId })
      .select('order_items.*', 'products.name as product_name', 'products.image_urls as product_image_urls');

    const customer = await db('users').where({ id: order.user_id }).first();

    return res.json({
      order,
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      } : null,
      items,
    });
  } catch (error) {
    console.error('Failed to fetch merchant order details:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
