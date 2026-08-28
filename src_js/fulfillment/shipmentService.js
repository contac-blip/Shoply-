const SHIPMENT_FLOW = {
  pending: ['packed', 'cancelled'],
  packed: ['ready_for_dispatch', 'in_transit', 'cancelled'],
  ready_for_dispatch: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'failed_delivery', 'returned'],
  delivered: ['returned'],
  failed_delivery: ['returned', 'rescheduled'],
  returned: [],
  rescheduled: ['in_transit'],
  cancelled: [],
};

export function validateShipmentStatusTransition(currentStatus, nextStatus) {
  const allowed = SHIPMENT_FLOW[currentStatus] || [];
  const isAllowed = allowed.includes(nextStatus);

  return {
    currentStatus,
    nextStatus,
    allowed: isAllowed,
    reason: isAllowed
      ? 'Status transition is valid.'
      : `Status transition from ${currentStatus} to ${nextStatus} is not allowed.`,
    allowedTransitions: allowed,
  };
}

export function createReturnRequest({ orderTotal = 0, returnedAmount = 0, refundPercent = 0 } = {}) {
  const total = Number(orderTotal) || 0;
  const returned = Number(returnedAmount) || 0;
  const percent = Number(refundPercent) || 0;
  const refundAmount = percent > 0 ? (total * percent) / 100 : returned;

  return {
    status: 'requested',
    orderTotal: total,
    returnedAmount: returned,
    refundPercentage: percent,
    refundAmount,
  };
}

export function calculateRefundAmount({ orderTotal = 0, refundPercent = 0 } = {}) {
  return ((Number(orderTotal) || 0) * (Number(refundPercent) || 0)) / 100;
}
