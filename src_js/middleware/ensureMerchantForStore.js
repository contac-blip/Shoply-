import db from '../../config/db.js';

export default async function ensureMerchantForStore(req, res, next) {
  try {
    const user = req.user;
    const tenantId = req.tenantId || req.body.tenant_id || req.params.tenant_id;

    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!tenantId) return res.status(400).json({ message: 'Missing tenant/store context' });

    const role = String(user.role || '').toLowerCase();
    if (!['merchant', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'User is not a merchant' });
    }

    if (role === 'admin') return next();

    const merchant = await db('merchants').where({ user_id: user.id }).first();
    if (!merchant) return res.status(403).json({ message: 'Merchant profile not found' });

    const merchantStatus = String(merchant.status || 'pending').toLowerCase();
    if (!['approved', 'active'].includes(merchantStatus)) {
      return res.status(403).json({
        message: 'Merchant account is awaiting approval',
        code: 'MERCHANT_PENDING_APPROVAL',
        status: merchantStatus,
      });
    }

    const mapping = await db('merchant_stores').where({ merchant_id: merchant.merchant_id, tenant_id: tenantId }).first();
    if (!mapping) return res.status(403).json({ message: 'Merchant does not manage this store' });

    return next();
  } catch (err) {
    console.error('ensureMerchantForStore error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
