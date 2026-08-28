import db from '../config/db.js';
import logger from '../logger.js';
import { emitOrderUpdate, emitNotification } from '../socket.js';

// Cart Controllers
export const getCart = async (req, res) => {
  try {
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // If request is tenant-scoped, ensure the cart belongs to that tenant
    if (req.tenantId && cart.tenant_id && String(cart.tenant_id) !== String(req.tenantId)) {
      return res.status(404).json({ message: 'Cart not found for this store' });
    }

    const items = await db('cart_items')
      .where({ cart_id: cart.id })
      .join('products', 'cart_items.product_id', '=', 'products.id')
      .select('cart_items.*', 'products.name', 'products.price', 'products.image_urls', 'products.tenant_id');

    res.json({ ...cart, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToCart = async (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;

  try {
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Validate product tenant matches cart tenant (if cart.tenant_id set)
    const product = await db('products').where({ id: product_id }).first();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // If request is tenant-scoped, ensure the product belongs to that tenant
    if (req.tenantId && product.tenant_id && String(product.tenant_id) !== String(req.tenantId)) {
      return res.status(400).json({ message: 'Product does not belong to this store' });
    }
    if (cart.tenant_id && product.tenant_id && String(cart.tenant_id) !== String(product.tenant_id)) {
      return res.status(400).json({ message: 'Cannot add product from different store to this cart' });
    }
    // If cart has no tenant, set it to product's tenant
    if (!cart.tenant_id && product.tenant_id) {
      await db('carts').where({ id: cart.id }).update({ tenant_id: product.tenant_id });
    }

    // Check if item already exists in cart
    const existingItem = await db('cart_items')
      .where({ cart_id: cart.id, product_id, variant_id })
      .first();

    if (existingItem) {
      await db('cart_items')
        .where({ id: existingItem.id })
        .update({ quantity: existingItem.quantity + quantity });
    } else {
      await db('cart_items').insert({
        cart_id: cart.id,
        product_id,
        variant_id,
        quantity
      });
    }

    res.status(201).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  try {
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    if (req.tenantId && cart.tenant_id && String(cart.tenant_id) !== String(req.tenantId)) {
      return res.status(404).json({ message: 'Cart not found for this store' });
    }
    const updated = await db('cart_items')
      .where({ id, cart_id: cart.id })
      .update({ quantity });
    if (!updated) return res.status(404).json({ message: 'Cart item not found' });
    res.json({ message: 'Cart item updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCartItem = async (req, res) => {
  const { id } = req.params;
  try {
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    if (req.tenantId && cart.tenant_id && String(cart.tenant_id) !== String(req.tenantId)) {
      return res.status(404).json({ message: 'Cart not found for this store' });
    }
    const deleted = await db('cart_items')
      .where({ id, cart_id: cart.id })
      .del();
    if (!deleted) return res.status(404).json({ message: 'Cart item not found' });
    res.json({ message: 'Cart item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Order Controllers
export const createOrder = async (req, res) => {
  const { shipping_address_id, shipping_method, shipping_amount = 0, payment_method, points_used = 0, promo_code, promo_discount = 0 } = req.body;

  const trx = await db.transaction();

  try {
    const cart = await trx('carts').where({ user_id: req.user.id }).first();
    if (!cart) {
      await trx.rollback();
      return res.status(404).json({ message: 'Cart not found' });
    }
    if (req.tenantId && cart.tenant_id && String(cart.tenant_id) !== String(req.tenantId)) {
      await trx.rollback();
      return res.status(404).json({ message: 'Cart not found for this store' });
    }
    const cartItems = await trx('cart_items')
      .where({ cart_id: cart.id })
      .join('products', 'cart_items.product_id', '=', 'products.id')
      .select('cart_items.*', 'products.price', 'products.stock_quantity', 'products.tenant_id');

    if (cartItems.length === 0) {
      await trx.rollback();
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Check stock and calculate total
    let totalAmount = 0;

    // Ensure all items belong to same tenant
    const tenantSet = new Set(cartItems.map(i => i.tenant_id || null));
    if (tenantSet.size > 1) {
      await trx.rollback();
      return res.status(400).json({ message: 'Cart contains products from multiple stores. Please checkout per store.' });
    }
    // Resolve tenant for this order: prefer tenant from items, fall back to request tenant
    let orderTenantId = cartItems[0] ? cartItems[0].tenant_id : null;
    if (!orderTenantId && req.tenantId) orderTenantId = req.tenantId;

    for (const item of cartItems) {
      // if variant present, check variant stock
      if (item.variant_id) {
        const variant = await trx('product_variants').where({ id: item.variant_id }).first();
        if (!variant || variant.stock_quantity < item.quantity) {
          await trx.rollback();
          return res.status(400).json({ message: `Insufficient stock for variant ${item.variant_id}` });
        }
      } else if (item.stock_quantity < item.quantity) {
        await trx.rollback();
        return res.status(400).json({ message: `Insufficient stock for product ${item.product_id}` });
      }

      totalAmount += item.price * item.quantity;

      // Reduce stock by variant or product
      if (item.variant_id) {
        await trx('product_variants')
          .where({ id: item.variant_id })
          .decrement('stock_quantity', item.quantity);
      } else {
        await trx('products')
          .where({ id: item.product_id })
          .decrement('stock_quantity', item.quantity);
      }
    }

    const requestedPoints = Math.max(Number(points_used) || 0, 0);
    const pointsRows = requestedPoints > 0
      ? await trx('loyalty_points').where({ user_id: req.user.id }).modify((query) => {
        if (req.tenantId) query.where({ tenant_id: req.tenantId });
      })
      : [];
    const availablePoints = pointsRows.reduce((sum, row) => sum + Number(row.points || 0), 0);
    const pointsUsed = Math.min(requestedPoints, Math.max(availablePoints, 0));
    const discountAmount = pointsUsed;
    const promoDiscount = Math.max(Number(promo_discount) || 0, 0);
    totalAmount = Math.max(totalAmount + Number(shipping_amount || 0) - discountAmount - promoDiscount, 0);

    const [order] = await trx('orders').insert({
      user_id: req.user.id,
      shipping_address_id,
      total_amount: totalAmount,
      status: 'pending',
      tenant_id: orderTenantId,
      shipping_method,
      shipping_amount: Number(shipping_amount || 0),
      payment_method,
      points_used: pointsUsed,
      discount_amount: discountAmount,
      promo_code,
      promo_discount: promoDiscount,
    }).returning('*');

    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    await trx('order_items').insert(orderItems);

    if (pointsUsed > 0) {
      await trx('loyalty_redemptions').insert({
        user_id: req.user.id,
        tenant_id: orderTenantId,
        points_used: pointsUsed,
        discount_amount: discountAmount,
        order_id: order.id,
        status: 'applied',
      });
    }

    // Clear cart
    await trx('cart_items').where({ cart_id: cart.id }).del();

    await trx.commit();

    emitOrderUpdate(order.id, 'pending');
    emitNotification({
      title: 'Order placed',
      message: `Your order #${order.id} has been placed successfully.`,
      orderId: order.id,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    await trx.rollback();
    logger.error('Order creation failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOrders = async (req, res) => {
  try {
    let ordersQuery = db('orders').where({ user_id: req.user.id });
    if (req.tenantId) ordersQuery = ordersQuery.andWhere({ tenant_id: req.tenantId });
    const orders = await ordersQuery.orderBy('created_at', 'desc');
    
    // For each order, get items
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await db('order_items')
        .where({ order_id: order.id })
        .join('products', 'order_items.product_id', '=', 'products.id')
        .select('order_items.*', 'products.name', 'products.image_urls');
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
