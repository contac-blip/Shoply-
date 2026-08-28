import express from 'express';
import {
  createInvoice,
  createPayoutReconciliation,
  listSettlementSummary,
} from '../Controllers/reconciliationController.js';

const router = express.Router();

router.post('/invoices', createInvoice);
router.post('/reconciliation', createPayoutReconciliation);
router.post('/settlements/summary', listSettlementSummary);

export default router;
