import db from '../config/db.js';
import { getAllowedTransitions, validateStatusTransition, getFulfillmentProgress } from '../src_js/fulfillment/fulfillmentService.js';

export const getFulfillmentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await db('orders')
      .where({ id: orderId, tenant_id: req.tenantId })
      .first();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const progress = getFulfillmentProgress(order.status || 'pending');

    return res.json({
      orderId,
      status: order.status || 'pending',
      progress,
      nextStatuses: getAllowedTransitions(order.status || 'pending'),
    });
  } catch (error) {
    console.error('Failed to fetch fulfillment status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateFulfillmentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await db('orders').where({ id: orderId, tenant_id: req.tenantId }).first();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const currentStatus = order.status || 'pending';
    const validation = validateStatusTransition(currentStatus, status);

    if (!validation.allowed) {
      return res.status(400).json({
        message: validation.reason,
        ...validation,
      });
    }

    await db('orders').where({ id: orderId, tenant_id: req.tenantId }).update({ status });

    return res.status(200).json({
      message: 'Fulfillment status updated',
      orderId,
      previousStatus: currentStatus,
      nextStatus: status,
      progress: getFulfillmentProgress(status),
    });
  } catch (error) {
    console.error('Failed to update fulfillment status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
