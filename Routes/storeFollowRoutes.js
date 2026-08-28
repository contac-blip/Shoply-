import express from 'express';
import { auth } from '../Auth/auth.js';
import { getFollowedStores, followStore, unfollowStore } from '../Controllers/storeFollowController.js';

const router = express.Router();
router.use(auth);
router.get('/', getFollowedStores);
router.post('/', followStore);
router.delete('/:brand_name', unfollowStore);
export default router;
