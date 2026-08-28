import express from 'express';
import { 
  getProductReviews, addReview, 
  getWishlist, addToWishlist, removeFromWishlist 
} from '../Controllers/extraController.js';
import { auth } from '../Auth/auth.js';

const router = express.Router();

// Public reviews
router.get('/products/:product_id/reviews', getProductReviews);

// Protected reviews & wishlist
router.use(auth);
router.post('/products/:product_id/reviews', addReview);
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:product_id', removeFromWishlist);

export default router;
