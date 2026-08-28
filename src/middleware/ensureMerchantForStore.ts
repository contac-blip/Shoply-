import { Request, Response, NextFunction } from 'express';
import db from '../../config/db.js';

// Middleware: ensures the authenticated user is a merchant and manages the requested store (tenant)
export async function ensureMerchantForStore(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    const tenantId = req.tenantId || req.body.tenant_id || req.params.tenant_id;

    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!tenantId) return res.status(400).json({ message: 'Missing tenant/store context' });

    if (!['merchant', 'admin'].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({ message: 'User is not a merchant' });
    }

    // Check merchant profile and mapping
    const merchant = await db('merchants').where({ user_id: user.id }).first();
    if (!merchant && String(user.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Merchant profile not found' });
    }

    if (String(user.role).toLowerCase() === 'admin') {
      // admins pass
      return next();
    }

    const mapping = await db('merchant_stores').where({ merchant_id: merchant.merchant_id, tenant_id: tenantId }).first();
    if (!mapping) {
      return res.status(403).json({ message: 'Merchant does not manage this store' });
    }

    // OK
    return next();
  } catch (err) {
    console.error('ensureMerchantForStore error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export default ensureMerchantForStore;
