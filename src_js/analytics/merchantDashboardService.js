export function buildMerchantDashboard({
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
    utilization: totalOrders > 0 ? Math.min((pendingFulfillment / totalOrders) * 100, 100) : 0,
  };
}

export function summarizeSalesByStore(orders = []) {
  const map = new Map();

  for (const order of orders) {
    const tenantId = order.tenant_id || 'unknown';
    const current = map.get(tenantId) || { tenant_id: tenantId, totalRevenue: 0, totalOrders: 0 };

    current.totalRevenue += Number(order.total_amount || 0);
    current.totalOrders += 1;
    map.set(tenantId, current);
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function summarizeInventoryHealth(stockLevels = []) {
  const summary = {
    healthy: 0,
    lowStock: 0,
    outOfStock: 0,
  };

  for (const item of stockLevels) {
    const available = Number(item.available_quantity || 0);
    const reorderLevel = Number(item.reorder_level || 0);

    if (available <= 0) summary.outOfStock += 1;
    else if (available <= reorderLevel) summary.lowStock += 1;
    else summary.healthy += 1;
  }

  return summary;
}
