import db from '../../config/db.js';

/**
 * JS Multi-tenant middleware
 * - reads X-Tenant-ID from headers or query
 * - validates tenant exists in `tenants` table
 * - attaches tenantId and tenant object to req
 */
export async function tenantMiddleware(req, res, next) {
  try {
    const header = req.header('X-Tenant-ID') || req.header('x-tenant-id') || req.query.tenantId;
    if (!header) return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
    const tenantId = String(header).trim();
    if (!tenantId) return res.status(400).json({ error: 'Invalid X-Tenant-ID header' });

    const tenant = await db('tenants').where({ id: tenantId }).first();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    if (req.user && req.user.tenant_id && String(req.user.tenant_id) !== String(tenantId)) {
      return res.status(403).json({ error: 'User does not belong to this tenant' });
    }

    req.tenantId = tenantId;
    req.tenant = tenant;
    return next();
  } catch (err) {
    console.error('tenantMiddleware error', err);
    return res.status(500).json({ error: 'Tenant validation failed' });
  }
}

export default tenantMiddleware;
