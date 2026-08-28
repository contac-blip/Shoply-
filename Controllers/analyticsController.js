import db from '../config/db.js';
import {
  summarizeSales,
  summarizeTopProducts,
  summarizeMerchantPerformance,
} from '../src_js/analytics/analyticsService.js';

export const getSalesDashboard = async (req, res) => {
  try {
    const orders = await db('orders').select('*');
    const orderItems = await db('order_items').select('*');

    const salesSummary = summarizeSales(orders);
    const topProducts = summarizeTopProducts(orderItems);
    const merchantPerformance = summarizeMerchantPerformance(orders);

    return res.json({
      salesSummary,
      topProducts,
      merchantPerformance,
    });
  } catch (error) {
    console.error('Analytics dashboard failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
