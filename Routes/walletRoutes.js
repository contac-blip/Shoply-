import express from 'express';
import { auth } from '../Auth/auth.js';
import { getWalletHistory } from '../Controllers/walletController.js';

const router = express.Router();

router.use(auth);
router.get('/history', getWalletHistory);

export default router;
