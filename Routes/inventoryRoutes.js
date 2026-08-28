import express from 'express';
import { getInventoryState, reserveStock, adjustStock } from '../Controllers/inventoryController.js';

const router = express.Router();

router.get('/products/:productId', getInventoryState);
router.post('/reserve', reserveStock);
router.post('/adjust', adjustStock);

export default router;
