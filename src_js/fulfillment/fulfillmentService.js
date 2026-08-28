const FULFILLMENT_FLOW = {
  pending: ['packed', 'cancelled'],
  packed: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'returned'],
  delivered: ['returned'],
  returned: [],
  cancelled: [],
};

const FULFILLMENT_LABELS = {
  pending: 'Pending',
  packed: 'Packed',
  ready_for_dispatch: 'Ready for Dispatch',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

const FULFILLMENT_PROGRESS = {
  pending: { value: 10, label: 'Pending' },
  packed: { value: 30, label: 'Packed' },
  ready_for_dispatch: { value: 50, label: 'Ready for Dispatch' },
  in_transit: { value: 80, label: 'In Transit' },
  delivered: { value: 100, label: 'Delivered', isFinal: true },
  returned: { value: 100, label: 'Returned', isFinal: true },
  cancelled: { value: 0, label: 'Cancelled', isFinal: true },
};

export function getAllowedTransitions(currentStatus) {
  return FULFILLMENT_FLOW[currentStatus] || [];
}

export function validateStatusTransition(currentStatus, nextStatus) {
  const allowedStates = getAllowedTransitions(currentStatus);
  const isAllowed = allowedStates.includes(nextStatus);

  return {
    currentStatus,
    nextStatus,
    allowed: isAllowed,
    reason: isAllowed
      ? 'Status transition is valid.'
      : `Status transition from ${currentStatus} to ${nextStatus} is not allowed.`,
    allowedTransitions: allowedStates,
  };
}

export function getFulfillmentProgress(status) {
  const progress = FULFILLMENT_PROGRESS[status] || {
    value: 0,
    label: FULFILLMENT_LABELS[status] || 'Unknown',
    isFinal: false,
  };

  return {
    ...progress,
    label: progress.label || FULFILLMENT_LABELS[status] || 'Unknown',
    isFinal: Boolean(progress.isFinal),
  };
}

export function getFulfillmentSummary(status) {
  const progress = getFulfillmentProgress(status);
  const transitions = getAllowedTransitions(status);

  return {
    currentStatus: status,
    label: progress.label,
    progress: progress.value,
    isFinal: progress.isFinal,
    nextStates: transitions,
  };
}
