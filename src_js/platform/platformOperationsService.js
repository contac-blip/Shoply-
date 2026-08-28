export function calculateRefundReversal({
  orderTotal = 0,
  refundPercent = 0,
  returnedAmount = 0,
} = {}) {
  const total = Number(orderTotal) || 0;
  const percent = Number(refundPercent) || 0;
  const returned = Number(returnedAmount) || 0;

  const refundAmount = percent > 0 ? (total * percent) / 100 : returned;

  return {
    refundAmount,
    reversalStatus: 'queued',
    refunded: refundAmount > 0,
  };
}

export function applyLoyaltyRedemption({
  pointsBalance = 0,
  pointsUsed = 0,
  conversionRate = 1,
  orderTotal = 0,
} = {}) {
  const availablePoints = Number(pointsBalance) || 0;
  const used = Number(pointsUsed) || 0;
  const ratio = Number(conversionRate) || 1;
  const total = Number(orderTotal) || 0;

  const valid = used <= availablePoints;
  const discountAmount = valid ? used * ratio : 0;
  const remainingPoints = Math.max(availablePoints - used, 0);
  const orderTotalAfterDiscount = Math.max(total - discountAmount, 0);

  return {
    applied: valid && used > 0 && total > 0,
    discountAmount,
    remainingPoints,
    pointsUsed: valid ? used : 0,
    conversionRate: ratio,
    orderTotalAfterDiscount,
  };
}

export function materializeMerchantSummary({
  totalRevenue = 0,
  totalOrders = 0,
  pendingFulfillment = 0,
  lowStockItems = 0,
  returnRate = 0,
} = {}) {
  return {
    totalRevenue: Number(totalRevenue) || 0,
    totalOrders: Number(totalOrders) || 0,
    pendingFulfillment: Number(pendingFulfillment) || 0,
    lowStockItems: Number(lowStockItems) || 0,
    returnRate: Number(returnRate) || 0,
    generatedAt: new Date().toISOString(),
  };
}

export function buildMerchantSummaryFromOperations({
  orders = [],
  stockLevels = [],
  returnRequests = [],
} = {}) {
  const pendingOrders = orders.filter((order) => ['pending', 'packed', 'ready_for_dispatch', 'in_transit'].includes(String(order.status || '').toLowerCase()));

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalOrders = orders.length;
  const pendingFulfillment = pendingOrders.length;
  const lowStockItems = stockLevels.filter((item) => {
    const available = Number(item.available_quantity || 0);
    const threshold = Number(item.reorder_level || 0);
    return available > 0 && available <= threshold;
  }).length;
  const returnRate = totalOrders > 0 ? Number(returnRequests.length) / Number(totalOrders) : 0;

  return materializeMerchantSummary({
    totalRevenue,
    totalOrders,
    pendingFulfillment,
    lowStockItems,
    returnRate,
  });
}

export function scheduleMerchantSummaryJob({
  tenantId = null,
  intervalMs = 60000,
  enabled = true,
} = {}) {
  return {
    tenantId,
    intervalMs: Number(intervalMs) || 60000,
    enabled: Boolean(enabled),
    schedule: enabled ? 'active' : 'paused',
  };
}

export function materializeMerchantSummarySnapshot({
  tenantId = null,
  orders = [],
  stockLevels = [],
  returnRequests = [],
} = {}) {
  const summary = buildMerchantSummaryFromOperations({ orders, stockLevels, returnRequests });
  return {
    tenantId,
    ...summary,
  };
}

export async function persistMerchantSummarySnapshot(db, {
  tenantId = null,
  orders = [],
  stockLevels = [],
  returnRequests = [],
} = {}) {
  const snapshot = materializeMerchantSummarySnapshot({
    tenantId,
    orders,
    stockLevels,
    returnRequests,
  });

  const hasSummaryTable = db?.schema?.hasTable ? await db.schema.hasTable('merchant_dashboard_summary') : true;
  if (!hasSummaryTable) {
    return { ...snapshot, persisted: false, reason: 'merchant_dashboard_summary table missing' };
  }

  const table = typeof db === 'function'
    ? db('merchant_dashboard_summary')
    : typeof db?.merchant_dashboard_summary === 'function'
      ? db.merchant_dashboard_summary()
      : db?.merchant_dashboard_summary;

  if (!table || typeof table.insert !== 'function') {
    return { ...snapshot, persisted: false, reason: 'merchant_dashboard_summary table unavailable' };
  }

  const insertResult = table.insert({
    tenant_id: tenantId,
    total_revenue: snapshot.totalRevenue,
    total_orders: snapshot.totalOrders,
    pending_fulfillment: snapshot.pendingFulfillment,
    low_stock_items: snapshot.lowStockItems,
    return_rate: snapshot.returnRate,
    generated_at: new Date().toISOString(),
  });
  const rows = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || []);
  const [record] = Array.isArray(rows) ? rows : [rows];

  return {
    ...snapshot,
    persisted: true,
    record: record || null,
  };
}
