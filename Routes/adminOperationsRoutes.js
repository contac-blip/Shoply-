import express from 'express';
import db from '../config/db.js';
import { auth, authorize } from '../Auth/auth.js';
import { logActivity } from '../auditLogger.js';
import { validateShipmentStatusTransition, calculateRefundAmount } from '../src_js/fulfillment/shipmentService.js';

const router = express.Router();
router.use(auth);
router.use(authorize('admin'));

router.patch('/shipments/:shipmentId/status', async (req, res) => {
  try {
    const shipment = await db('shipments').where({ id: req.params.shipmentId }).first();
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    const validation = validateShipmentStatusTransition(shipment.status || 'pending', req.body?.status);
    if (!validation.allowed) return res.status(400).json({ message: validation.reason, ...validation });
    await db('shipments').where({ id: shipment.id }).update({ status: req.body.status, updated_at: db.fn.now() });
    await logActivity(req, 'admin_update_shipment_status', 'shipment', shipment.id, shipment, { status: req.body.status });
    return res.json({ message: 'Shipment status updated', shipmentId: shipment.id, status: req.body.status });
  } catch (error) {
    console.error('Admin shipment update failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/returns/:returnRequestId/refund', async (req, res) => {
  try {
    const request = await db('return_requests').where({ id: req.params.returnRequestId }).first();
    if (!request) return res.status(404).json({ message: 'Return request not found' });
    if (['refunded', 'rejected'].includes(String(request.status).toLowerCase())) return res.status(409).json({ message: 'Return request is already finalized' });
    const refundAmount = calculateRefundAmount({ orderTotal: req.body?.order_total || request.refund_amount, refundPercent: req.body?.refund_percent ?? 100 });
    await db('return_requests').where({ id: request.id }).update({ status: 'refunded', refund_amount: refundAmount, processed_at: db.fn.now(), updated_at: db.fn.now() });
    await logActivity(req, 'admin_process_refund', 'return_request', request.id, request, { status: 'refunded', refund_amount: refundAmount });
    return res.json({ message: 'Refund processed', refundAmount });
  } catch (error) {
    console.error('Admin refund failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/settlements/:settlementId/status', async (req, res) => {
  const status = String(req.body?.status || '').toUpperCase();
  if (!['APPROVED', 'PAID', 'FAILED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Invalid settlement status' });
  try {
    const settlement = await db('merchant_settlement_runs').where({ id: req.params.settlementId }).first();
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });
    const updates = { status, updated_at: db.fn.now(), ...(status === 'PAID' ? { paid_at: db.fn.now() } : {}) };
    await db('merchant_settlement_runs').where({ id: settlement.id }).update(updates);
    await logActivity(req, 'admin_update_settlement_status', 'merchant_settlement_run', settlement.id, settlement, updates);
    return res.json({ settlement: { ...settlement, ...updates } });
  } catch (error) {
    console.error('Admin settlement update failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/fraud-flags/:flagId/resolve', async (req, res) => {
  try {
    const flag = await db('fraud_flags').where({ id: req.params.flagId }).first();
    if (!flag) return res.status(404).json({ message: 'Fraud flag not found' });
    await db('fraud_flags').where({ id: flag.id }).update({ is_resolved: true, updated_at: db.fn.now() });
    await logActivity(req, 'admin_resolve_fraud_flag', 'fraud_flag', flag.id, flag, { is_resolved: true });
    return res.json({ message: 'Fraud flag resolved', flagId: flag.id });
  } catch (error) {
    console.error('Admin fraud resolution failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [shipments, returns, fraudFlags, auditLogs, invoices, settlements, commissions] = await Promise.all([
      db('shipments').select('*').orderBy('created_at', 'desc').limit(100),
      db('return_requests').select('*').orderBy('requested_at', 'desc').limit(100),
      db('fraud_flags').select('*').orderBy('created_at', 'desc').limit(100),
      db('audit_logs').select('*').orderBy('created_at', 'desc').limit(100),
      db('invoices').select('*').orderBy('created_at', 'desc').limit(100),
      db('settlements').select('*').orderBy('created_at', 'desc').limit(100),
      db('commission_entries').select('*').orderBy('created_at', 'desc').limit(100),
    ]);
    return res.json({ shipments, returns, fraudFlags, auditLogs, invoices, settlements, commissions });
  } catch (error) {
    console.error('Failed to load admin operations:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
