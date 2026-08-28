import express from 'express';
import db from '../config/db.js';
import {
  getStats,
  getAdminOrders,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminCategories,
  createCategory,
  updateCategory,
  updateCategoryImage,
  deleteCategory,
} from '../Controllers/adminController.js';
import { auth, authorize } from '../Auth/auth.js';
import { upload } from '../upload.js';
import { tenantMiddleware } from '../src_js/middleware/tenantMiddleware.js';
import ensureMerchantForStore from '../src_js/middleware/ensureMerchantForStore.js';
import { normalizePagination } from '../src_js/merchant/merchantQueryService.js';

const router = express.Router();

router.use(auth);
router.use(authorize('merchant', 'admin'));
// require tenant context and ownership for merchant routes
router.use(tenantMiddleware);
router.use(ensureMerchantForStore);

router.get('/stats', getStats);
router.get('/orders', getAdminOrders);
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.put('/categories/:id/image', upload.single('image'), updateCategoryImage);
router.delete('/categories/:id', deleteCategory);
router.get('/products', getAdminProducts);
router.post('/products', upload.array('images', 5), createProduct);
router.put('/products/:id', upload.array('images', 5), updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/orders/filter', async (req, res) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query;
    const { offset } = normalizePagination(page, limit);
    let query = db('orders')
      .join('users', 'orders.user_id', '=', 'users.id')
      .select('orders.*', 'users.email', 'users.first_name', 'users.last_name')
      .where('orders.tenant_id', req.tenantId)
      .orderBy('orders.created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    if (status) {
      query = query.where('orders.status', status);
    }

    if (search) {
      const term = `%${String(search).trim().toLowerCase()}%`;
      query = query.where((builder) => {
        builder.whereRaw('LOWER(CAST(users.email AS TEXT)) LIKE ?', [term])
          .orWhereRaw('LOWER(CAST(users.first_name AS TEXT)) LIKE ?', [term])
          .orWhereRaw('LOWER(CAST(users.last_name AS TEXT)) LIKE ?', [term]);
      });
    }

    const rows = await query;
    return res.json({ items: rows, page: Number(page), limit: Number(limit), offset });
  } catch (error) {
    console.error('Failed to filter merchant orders:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
