import express from 'express';
import { checkFraudRisk, createSupportTicket } from '../Controllers/platformControlsController.js';

const router = express.Router();

router.post('/fraud/check', checkFraudRisk);
router.post('/support/tickets', createSupportTicket);

export default router;
