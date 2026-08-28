import db from '../config/db.js';
import {
  calculateStockState,
  validateReservationAvailability,
} from '../src_js/inventory/inventoryService.js';

export const getInventoryState = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await db('products').where({ id: productId }).first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variants = await db('product_variants').where({ product_id: productId });

    const stockState = calculateStockState({
      on_hand_quantity: Number(product.stock_quantity || 0),
      reserved_quantity: 0,
      reorder_level: Number(product.reorder_level || 0),
    });

    const variantStocks = variants.map((variant) => ({
      ...variant,
      stock: calculateStockState({
        on_hand_quantity: Number(variant.stock_quantity || 0),
        reserved_quantity: 0,
        reorder_level: Number(variant.reorder_level || 0),
      }),
    }));

    return res.json({
      product_id: productId,
      stock: stockState,
      variants: variantStocks,
    });
  } catch (error) {
    console.error('Inventory lookup failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const reserveStock = async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const requestedQuantity = Number(quantity) || 0;

    if (!product_id && !variant_id) {
      return res.status(400).json({ message: 'product_id or variant_id is required' });
    }

    if (requestedQuantity <= 0) {
      return res.status(400).json({ message: 'quantity must be greater than zero' });
    }

    const stockRecord = variant_id
      ? await db('product_variants').where({ id: variant_id }).first()
      : await db('products').where({ id: product_id }).first();

    if (!stockRecord) {
      return res.status(404).json({ message: 'Stock record not found' });
    }

    const onHandQuantity = Number(stockRecord.stock_quantity || 0);
    const validation = validateReservationAvailability({
      on_hand_quantity: onHandQuantity,
      reserved_quantity: 0,
      requested_quantity: requestedQuantity,
      reorder_level: Number(stockRecord.reorder_level || 0),
    });

    if (!validation.allowed) {
      return res.status(400).json({
        message: validation.reason,
        ...validation,
      });
    }

    if (variant_id) {
      await db('product_variants').where({ id: variant_id }).decrement('stock_quantity', requestedQuantity);
    } else {
      await db('products').where({ id: product_id }).decrement('stock_quantity', requestedQuantity);
    }

    return res.status(200).json({
      message: 'Stock reserved successfully',
      ...validation,
      stock_after_reservation: Math.max(onHandQuantity - requestedQuantity, 0),
    });
  } catch (error) {
    console.error('Stock reservation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { product_id, variant_id, quantity, reason = 'manual_adjustment' } = req.body;
    const adjustment = Number(quantity) || 0;

    if (!product_id && !variant_id) {
      return res.status(400).json({ message: 'product_id or variant_id is required' });
    }

    if (adjustment === 0) {
      return res.status(400).json({ message: 'quantity must not be zero' });
    }

    const stockRecord = variant_id
      ? await db('product_variants').where({ id: variant_id }).first()
      : await db('products').where({ id: product_id }).first();

    if (!stockRecord) {
      return res.status(404).json({ message: 'Stock record not found' });
    }

    const updatedQuantity = Math.max(Number(stockRecord.stock_quantity || 0) + adjustment, 0);

    if (variant_id) {
      await db('product_variants').where({ id: variant_id }).update({ stock_quantity: updatedQuantity });
    } else {
      await db('products').where({ id: product_id }).update({ stock_quantity: updatedQuantity });
    }

    return res.status(200).json({
      message: 'Stock adjusted successfully',
      reason,
      previous_quantity: Number(stockRecord.stock_quantity || 0),
      adjusted_quantity: updatedQuantity,
    });
  } catch (error) {
    console.error('Stock adjustment failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
