import express from 'express';
import { getCart, addToCart, updateCartItem, deleteCartItem, createOrder, getOrders } from '../Controllers/cartOrderController.js';
import { auth } from '../Auth/auth.js';

const router = express.Router();

router.use(auth);

router.get('/cart', getCart);
router.post('/cart', addToCart);
router.put('/cart/:id', updateCartItem);
router.delete('/cart/:id', deleteCartItem);
router.get('/orders', getOrders);
router.post('/orders', createOrder);

export default router;
