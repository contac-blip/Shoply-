export function calculatePromoDiscount({ type = 'percentage', value = 0, orderTotal = 0 } = {}) {
  const total = Number(orderTotal) || 0;
  const numericValue = Number(value) || 0;

  if (type === 'fixed') {
    const discountAmount = Math.min(numericValue, total);
    return {
      type,
      value: numericValue,
      discountAmount,
      finalAmount: Math.max(total - discountAmount, 0),
    };
  }

  const discountAmount = (total * numericValue) / 100;
  return {
    type,
    value: numericValue,
    discountAmount,
    finalAmount: Math.max(total - discountAmount, 0),
  };
}

export function getCampaignStatus({ status = 'draft', start_at, end_at } = {}) {
  const now = new Date();
  const startDate = start_at ? new Date(start_at) : null;
  const endDate = end_at ? new Date(end_at) : null;

  const isActive = status === 'active' && (!startDate || now >= startDate) && (!endDate || now <= endDate);

  return {
    state: status,
    isActive,
    start_at,
    end_at,
  };
}

export function normalizePromoPayload(payload = {}) {
  return {
    code: String(payload.code || '').trim(),
    type: payload.type || 'percentage',
    value: Number(payload.value || 0),
    min_order_amount: Number(payload.min_order_amount || 0),
    is_active: Boolean(payload.is_active),
    usage_limit: Number(payload.usage_limit || 0),
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };
}
