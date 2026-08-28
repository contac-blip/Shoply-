import db from '../config/db.js';
import logger from '../logger.js';

export const getProducts = async (req, res) => {
  const { category_id, brand_name, search, sort_by, limit = 10, offset = 0 } = req.query;

  try {
    let query = db('products').select('*');

    // If tenant context is present, scope results to tenant
    if (req.tenantId) {
      query = query.where({ tenant_id: req.tenantId });
    }

    if (category_id) {
      query = query.where({ category_id });
    }

    if (brand_name) {
      query = query.where('brand_name', brand_name);
    }

    if (search) {
      query = query.where('name', 'ilike', `%${search}%`).orWhere('brand_name', 'ilike', `%${search}%`);
    }

    if (sort_by) {
      switch (sort_by) {
        case 'price_asc':
          query = query.orderBy('price', 'asc');
          break;
        case 'price_desc':
          query = query.orderBy('price', 'desc');
          break;
        case 'newest':
          query = query.orderBy('created_at', 'desc');
          break;
        default:
          query = query.orderBy('created_at', 'desc');
      }
    }

    const products = await query.limit(limit).offset(offset);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const q = db('products').where({ id });
    if (req.tenantId) q.andWhere({ tenant_id: req.tenantId });
    const product = await q.first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variants = await db('product_variants').where({ product_id: id });
    product.variants = variants;

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await db('categories').select('*');
    
    // Nest subcategories
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, sub_categories: [] };
    });

    const rootCategories = [];
    categories.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].sub_categories.push(categoryMap[cat.id]);
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });
    res.json(rootCategories);
  } catch (err) {
    logger.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
