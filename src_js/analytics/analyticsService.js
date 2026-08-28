export function summarizeSales(orders = []) {
  const completedOrders = orders.filter((order) => ['paid', 'completed', 'delivered'].includes(order.status));
  const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalOrders = completedOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    completedOrders,
  };
}

export function summarizeTopProducts(orderItems = []) {
  const productMap = new Map();

  for (const item of orderItems) {
    const productId = item.product_id;
    const quantity = Number(item.quantity || 0);
    const current = productMap.get(productId) || { product_id: productId, totalQuantity: 0 };

    current.totalQuantity += quantity;
    productMap.set(productId, current);
  }

  return Array.from(productMap.values()).sort((a, b) => {
    if (b.totalQuantity !== a.totalQuantity) {
      return b.totalQuantity - a.totalQuantity;
    }

    return String(b.product_id).localeCompare(String(a.product_id));
  });
}

export function summarizeMerchantPerformance(orders = []) {
  const map = new Map();

  for (const order of orders) {
    if (!['paid', 'completed', 'delivered'].includes(order.status)) continue;

    const tenantId = order.tenant_id || 'unknown';
    const current = map.get(tenantId) || {
      tenant_id: tenantId,
      totalRevenue: 0,
      totalOrders: 0,
    };

    current.totalRevenue += Number(order.total_amount || 0);
    current.totalOrders += 1;
    map.set(tenantId, current);
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}
