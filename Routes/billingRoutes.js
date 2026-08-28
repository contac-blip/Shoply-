import express from 'express';
import { createCommissionEntry, listCommissionEntries } from '../Controllers/billingController.js';

const router = express.Router();

router.post('/commissions', createCommissionEntry);
router.get('/commissions', listCommissionEntries);

export default router;
