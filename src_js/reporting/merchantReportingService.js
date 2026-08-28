export function buildMerchantReportingSummary({
  orders = [],
  currentSummary = {},
  returnRequests = [],
  fraudFlags = [],
  supportTickets = [],
} = {}) {
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const paidOrders = orders.filter((order) => ['paid', 'completed', 'delivered'].includes(String(order.status || '').toLowerCase()));
  const pendingFulfillment = orders.filter((order) => ['pending', 'packed', 'ready_for_dispatch', 'in_transit'].includes(String(order.status || '').toLowerCase())).length;
  const openTickets = supportTickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'open').length;
  const flaggedOrders = fraudFlags.filter((flag) => !flag.is_resolved).length;
  const returnRate = orders.length > 0 ? Number(returnRequests.length) / Number(orders.length) : 0;

  return {
    totalRevenue,
    totalOrders: orders.length,
    completedOrders: paidOrders.length,
    pendingFulfillment,
    returnRate,
    openTickets,
    flaggedOrders,
    merchantSummary: currentSummary,
  };
}
