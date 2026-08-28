import db from '../config/db.js';
import logger from '../logger.js';
import { Product } from '../Models/Product.js';
import { Category } from '../Models/Category.js';

export const getStats = async (req, res) => {
  try {
    // Optionally scope stats to tenant
    const orderWhere = req.tenantId ? { status: 'paid', tenant_id: req.tenantId } : { status: 'paid' };
    const totalSales = await db('orders').where(orderWhere).sum('total_amount as total');
    const orderCount = await db('orders').where(req.tenantId ? { tenant_id: req.tenantId } : {}).count('id as count');
    const userCount = await db('users').count('id as count');
    const productCount = await db('products').where(req.tenantId ? { tenant_id: req.tenantId } : {}).count('id as count');

    res.json({
      total_revenue: parseFloat(totalSales[0].total || 0),
      total_orders: parseInt(orderCount[0].count),
      total_users: parseInt(userCount[0].count),
      total_products: parseInt(productCount[0].count)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    let query = db('orders')
      .join('users', 'orders.user_id', '=', 'users.id')
      .select('orders.*', 'users.email', 'users.first_name', 'users.last_name')
      .orderBy('created_at', 'desc');

    if (req.tenantId) query = query.where('orders.tenant_id', req.tenantId);
    const orders = await query;
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const getAdminProducts = async (req, res) => {
  try {
    let query = db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select(
        'products.*',
        'categories.name as category_name',
      )
      .orderBy('products.created_at', 'desc');

    if (req.tenantId) query = query.where('products.tenant_id', req.tenantId);

    const rows = await query;
    const products = rows.map(row => Product.fromDb(row));
    res.json(products);
  } catch (err) {
    logger.error('Failed to fetch admin products:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const createProduct = async (req, res) => {
  const {
    name,
    description,
    brand_name,
    price,
    price_after_discount,
    discount_percent,
    category_id,
    stock_quantity
  } = req.body;

  const parsedPrice = Number(price);
  const parsedPriceAfterDiscount = price_after_discount !== undefined ? Number(price_after_discount) : null;
  const parsedDiscountPercent = discount_percent !== undefined ? Number(discount_percent) : null;
  const parsedStockQuantity = stock_quantity !== undefined ? Number(stock_quantity) : 0;

  if (!name || !brand_name || Number.isNaN(parsedPrice)) {
    return res.status(400).json({ message: 'Missing required product fields: name, brand_name, price' });
  }

  const imageUrls = req.files?.map(file => file.path) || [];

  try {
    const [product] = await db('products')
      .insert({
        name,
        description,
        brand_name,
        price: parsedPrice,
        price_after_discount: Number.isNaN(parsedPriceAfterDiscount) ? null : parsedPriceAfterDiscount,
        discount_percent: Number.isNaN(parsedDiscountPercent) ? null : parsedDiscountPercent,
        image_urls: imageUrls,
        category_id: category_id || null,
        stock_quantity: Number.isNaN(parsedStockQuantity) ? 0 : parsedStockQuantity,
        tenant_id: req.tenantId || null
      })
      .returning('*');

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    logger.error('Failed to create product:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    brand_name,
    price,
    price_after_discount,
    discount_percent,
    category_id,
    stock_quantity
  } = req.body;

  const parsedPrice = Number(price);
  const parsedPriceAfterDiscount = price_after_discount !== undefined ? Number(price_after_discount) : null;
  const parsedDiscountPercent = discount_percent !== undefined ? Number(discount_percent) : null;
  const parsedStockQuantity = stock_quantity !== undefined ? Number(stock_quantity) : 0;

  if (!name || !brand_name || Number.isNaN(parsedPrice)) {
    return res.status(400).json({ message: 'Missing required product fields: name, brand_name, price' });
  }

  const imageUrls = req.files?.map(file => file.path);

  try {
    const updateData = {
      name,
      description,
      brand_name,
      price: parsedPrice,
      price_after_discount: Number.isNaN(parsedPriceAfterDiscount) ? null : parsedPriceAfterDiscount,
      discount_percent: Number.isNaN(parsedDiscountPercent) ? null : parsedDiscountPercent,
      category_id: category_id || null,
      stock_quantity: Number.isNaN(parsedStockQuantity) ? 0 : parsedStockQuantity,
      updated_at: db.fn.now(),
    };

    if (imageUrls && imageUrls.length > 0) {
      updateData.image_urls = imageUrls;
    }

    const [product] = await db('products')
      .where(req.tenantId ? { id, tenant_id: req.tenantId } : { id })
      .update(updateData)
      .returning('*');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (err) {
    logger.error('Failed to update product:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCount = await db('products').where(req.tenantId ? { id, tenant_id: req.tenantId } : { id }).del();
    if (!deletedCount) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete product:', err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

export const getAdminCategories = async (req, res) => {
  try {
    let query = db('categories').select('*');
    if (req.tenantId) query = query.where((builder) => builder.where('tenant_id', req.tenantId).orWhereNull('tenant_id'));
    const categories = await query;
    res.json(categories);
  } catch (err) {
    logger.error('Failed to fetch admin categories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req, res) => {
  const { name, image_url, svg_src, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const [category] = await db('categories')
      .insert({
        name,
        image_url: image_url || null,
        svg_src: svg_src || null,
        parent_id: parent_id || null,
        tenant_id: req.tenantId || null,
      })
      .returning('*');

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    logger.error('Failed to create category:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, image_url, svg_src, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    let query = db('categories').where({ id });
    if (req.tenantId) query = query.where({ tenant_id: req.tenantId });
    const [category] = await query
      .update({
        name,
        image_url: image_url || null,
        svg_src: svg_src || null,
        parent_id: parent_id || null,
        updated_at: db.fn.now()
      })
      .returning('*');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category });
  } catch (err) {
    logger.error('Failed to update category:', err);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

export const updateCategoryImage = async (req, res) => {
  const { id } = req.params;
  const imageUrl = req.file?.path;
  if (!imageUrl) return res.status(400).json({ message: 'Category image is required' });

  try {
    const categoryQuery = db('categories').where({ id });
    if (req.tenantId) categoryQuery.where({ tenant_id: req.tenantId });
    const [category] = await categoryQuery
      .update({ image_url: imageUrl, updated_at: db.fn.now() })
      .returning('*');

    if (!category) return res.status(404).json({ message: 'Category not found' });
    return res.json({ message: 'Category image updated successfully', category });
  } catch (err) {
    logger.error('Failed to update category image:', err);
    return res.status(500).json({ message: 'Failed to update category image' });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    let query = db('categories').where({ id });
    if (req.tenantId) query = query.where({ tenant_id: req.tenantId });
    const deletedCount = await query.del();
    if (!deletedCount) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete category:', err);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};
