import db from '../config/db.js';
import {
  buildMerchantDashboard,
  summarizeSalesByStore,
  summarizeInventoryHealth,
} from '../src_js/analytics/merchantDashboardService.js';

export const getMerchantDashboard = async (req, res) => {
  try {
    const orders = await db('orders').select('*');
    const stockItems = await db('products').select('id', 'tenant_id', 'stock_quantity').map((product) => ({
      available_quantity: Number(product.stock_quantity || 0),
      reorder_level: Number(product.reorder_level || 0),
      tenant_id: product.tenant_id,
    }));

    const revenue = orders
      .filter((order) => ['paid', 'completed', 'delivered'].includes(order.status))
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const dashboard = buildMerchantDashboard({
      totalRevenue: revenue,
      totalOrders: orders.length,
      pendingFulfillment: orders.filter((order) => ['pending', 'packed', 'ready_for_dispatch', 'in_transit'].includes(order.status)).length,
      lowStockItems: stockItems.filter((item) => item.available_quantity > 0 && item.available_quantity <= (item.reorder_level || 0)).length,
      returnRate: 0,
    });

    const salesByStore = summarizeSalesByStore(orders);
    const inventoryHealth = summarizeInventoryHealth(stockItems);

    return res.json({
      dashboard,
      salesByStore,
      inventoryHealth,
    });
  } catch (error) {
    console.error('Merchant dashboard failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
