import db from '../config/db.js';

const scopedQuery = (query, req) => {
  if (req.tenantId) query.where({ tenant_id: req.tenantId });
  return query;
};

export const getFollowedStores = async (req, res) => {
  try {
    const query = db('store_follows').where({ user_id: req.user.id }).select('brand_name', 'tenant_id');
    res.json(await scopedQuery(query, req));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load followed stores' });
  }
};

export const followStore = async (req, res) => {
  const brandName = String(req.body.brand_name || '').trim();
  if (!brandName) return res.status(400).json({ message: 'brand_name is required' });
  try {
    const existing = await scopedQuery(
      db('store_follows').where({ user_id: req.user.id, brand_name: brandName }),
      req,
    ).first();
    if (existing) return res.json(existing);
    const [follow] = await db('store_follows').insert({
      user_id: req.user.id,
      brand_name: brandName,
      tenant_id: req.tenantId || null,
    }).returning('*');
    res.status(201).json(follow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to follow store' });
  }
};

export const unfollowStore = async (req, res) => {
  const brandName = String(req.params.brand_name || '').trim();
  try {
    const query = db('store_follows').where({ user_id: req.user.id, brand_name: brandName });
    const deleted = await scopedQuery(query, req).del();
    if (!deleted) return res.status(404).json({ message: 'Store follow not found' });
    res.json({ message: 'Store unfollowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to unfollow store' });
  }
};
