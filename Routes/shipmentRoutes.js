import express from 'express';
import { createShipment, updateShipmentStatus, createReturn, processRefund } from '../Controllers/shipmentController.js';

const router = express.Router();

router.post('/shipments', createShipment);
router.put('/shipments/:shipmentId/status', updateShipmentStatus);
router.post('/returns', createReturn);
router.post('/returns/:returnRequestId/refund', processRefund);

export default router;
