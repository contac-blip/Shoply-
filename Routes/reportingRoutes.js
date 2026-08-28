import express from 'express';
import { getMerchantReporting } from '../Controllers/reportingController.js';

const router = express.Router();

router.get('/merchant', getMerchantReporting);

export default router;
