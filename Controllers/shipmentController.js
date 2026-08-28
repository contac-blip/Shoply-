import db from '../config/db.js';
import { validateShipmentStatusTransition, createReturnRequest, calculateRefundAmount } from '../src_js/fulfillment/shipmentService.js';

export const createShipment = async (req, res) => {
  try {
    const { order_id, warehouse_id, courier_id, tracking_number, status = 'pending' } = req.body;

    if (!order_id) {
      return res.status(400).json({ message: 'order_id is required' });
    }

    const [shipment] = await db('shipments').insert({
      order_id,
      warehouse_id: warehouse_id || null,
      courier_id: courier_id || null,
      tracking_number: tracking_number || null,
      status,
    }).returning('*');

    return res.status(201).json({ message: 'Shipment created', shipment });
  } catch (error) {
    console.error('Shipment creation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateShipmentStatus = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { status } = req.body;

    const shipment = await db('shipments').where({ id: shipmentId }).first();
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    const validation = validateShipmentStatusTransition(shipment.status || 'pending', status);
    if (!validation.allowed) {
      return res.status(400).json({ message: validation.reason, ...validation });
    }

    await db('shipments').where({ id: shipmentId }).update({ status });
    return res.json({ message: 'Shipment status updated', shipmentId, status });
  } catch (error) {
    console.error('Shipment status update failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createReturn = async (req, res) => {
  try {
    const { order_id, reason, order_total = 0, returned_amount = 0, refund_percent = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ message: 'order_id is required' });
    }

    const request = createReturnRequest({
      orderTotal: order_total,
      returnedAmount: returned_amount,
      refundPercent: refund_percent,
    });

    const [returnRequest] = await db('return_requests').insert({
      order_id,
      reason: reason || 'customer_request',
      status: request.status,
      refund_amount: request.refundAmount,
      requested_at: new Date(),
    }).returning('*');

    return res.status(201).json({ message: 'Return request created', returnRequest, refund: request });
  } catch (error) {
    console.error('Return creation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { returnRequestId } = req.params;
    const { order_total = 0, refund_percent = 0 } = req.body;

    const returnRequest = await db('return_requests').where({ id: returnRequestId }).first();
    if (!returnRequest) {
      return res.status(404).json({ message: 'Return request not found' });
    }

    const refundAmount = calculateRefundAmount({
      orderTotal: order_total || returnRequest.refund_amount || 0,
      refundPercent: refund_percent || 100,
    });

    await db('return_requests').where({ id: returnRequestId }).update({
      status: 'refunded',
      refund_amount: refundAmount,
      processed_at: new Date(),
    });

    return res.json({ message: 'Refund processed', refundAmount });
  } catch (error) {
    console.error('Refund processing failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
