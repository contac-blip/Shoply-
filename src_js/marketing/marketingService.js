export function calculateDiscount(orderTotal = 0, discountPercent = 0) {
  const safeOrderTotal = Number(orderTotal) || 0;
  const safePercent = Number(discountPercent) || 0;
  const discountAmount = (safeOrderTotal * safePercent) / 100;

  return {
    orderTotal: safeOrderTotal,
    discountPercent: safePercent,
    discountAmount,
    finalAmount: Math.max(safeOrderTotal - discountAmount, 0),
  };
}

export function validatePromoCode({
  code,
  active = false,
  startDate,
  endDate,
  usageLimit = 0,
  usageCount = 0,
  minimumOrderAmount = 0,
  orderTotal = 0,
  discountType = 'percentage',
  discountPercent = 0,
} = {}) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const isActive = Boolean(active);
  const isStarted = !start || now >= start;
  const isNotExpired = !end || now <= end;
  const hasRemainingUsage = usageLimit <= 0 || usageCount < usageLimit;
  const meetsMinimumOrder = Number(orderTotal) >= Number(minimumOrderAmount || 0);

  const valid = isActive && isStarted && isNotExpired && hasRemainingUsage && meetsMinimumOrder;

  let reason = 'Promo code is valid.';
  if (!isActive) reason = 'Promo code is inactive.';
  else if (!isStarted) reason = 'Promo code has not started yet.';
  else if (!isNotExpired) reason = 'Promo code has expired.';
  else if (!hasRemainingUsage) reason = 'Promo code usage limit has been reached.';
  else if (!meetsMinimumOrder) reason = 'Order total is below the minimum required for this promo code.';

  return {
    code,
    valid,
    reason,
    discountType,
    discountPercent,
    minimumOrderAmount: Number(minimumOrderAmount || 0),
    orderTotal: Number(orderTotal || 0),
  };
}

export function applyCampaignRules({
  campaignType = 'standard',
  discountPercent = 0,
  orderTotal = 0,
  isEligible = true,
} = {}) {
  if (!isEligible) {
    return {
      campaignType,
      applied: false,
      reason: 'Customer is not eligible for this campaign.',
      discountAmount: 0,
      finalAmount: Number(orderTotal || 0),
    };
  }

  const { discountAmount, finalAmount } = calculateDiscount(orderTotal, discountPercent);

  return {
    campaignType,
    applied: true,
    discountPercent: Number(discountPercent || 0),
    discountAmount,
    finalAmount,
  };
}
