import db from '../config/db.js';
import {
  calculateRefundReversal,
  applyLoyaltyRedemption,
  materializeMerchantSummary,
} from '../src_js/platform/platformOperationsService.js';

export const processRefundReversal = async (req, res) => {
  try {
    const { order_total = 0, refund_percent = 0, returned_amount = 0 } = req.body;
    const result = calculateRefundReversal({
      orderTotal: order_total,
      refundPercent: refund_percent,
      returnedAmount: returned_amount,
    });

    return res.json({ message: 'Refund reversal queued', ...result });
  } catch (error) {
    console.error('Refund reversal failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const applyCustomerReward = async (req, res) => {
  try {
    const { points_balance = 0, points_used = 0, conversion_rate = 1, order_total = 0 } = req.body;
    const result = applyLoyaltyRedemption({
      pointsBalance: points_balance,
      pointsUsed: points_used,
      conversionRate: conversion_rate,
      orderTotal: order_total,
    });

    return res.json({ message: 'Reward applied', ...result });
  } catch (error) {
    console.error('Reward application failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const materializeSummary = async (req, res) => {
  try {
    const { total_revenue = 0, total_orders = 0, pending_fulfillment = 0, low_stock_items = 0, return_rate = 0 } = req.body;

    const summary = materializeMerchantSummary({
      totalRevenue: total_revenue,
      totalOrders: total_orders,
      pendingFulfillment: pending_fulfillment,
      lowStockItems: low_stock_items,
      returnRate: return_rate,
    });

    return res.json({ message: 'Merchant summary materialized', ...summary });
  } catch (error) {
    console.error('Summary materialization failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
