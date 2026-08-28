import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple in-process mock MTN gateway
// POST /ussd/push { mobile, amountCents, externalRef }
// returns { requestId }
router.post('/ussd/push', express.json(), (req, res) => {
  const { mobile, amountCents, externalRef } = req.body || {};
  // very small validation
  if (!mobile || !amountCents || !externalRef) {
    return res.status(400).json({ error: 'mobile, amountCents and externalRef required' });
  }
  // Simulate async provider acceptance
  const requestId = uuidv4();
  return res.status(200).json({ requestId, message: 'USSD push scheduled' });
});

export default router;
