import express from 'express';
import { getSalesDashboard } from '../Controllers/analyticsController.js';

const router = express.Router();

router.get('/dashboard', getSalesDashboard);

export default router;
