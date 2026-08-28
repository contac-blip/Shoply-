import { Request, Response, NextFunction } from 'express';
import prisma from '../models/prismaClient';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: any;
    }
  }
}

/**
 * Multi-tenant middleware
 * - Reads `X-Tenant-ID` (case-insensitive) from headers
 * - Validates existence in `tenant` table
 * - Attaches `tenantId` and `tenant` to `req`
 * - Fails fast on missing/invalid tenant
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header('X-Tenant-ID') || req.header('x-tenant-id') || req.query.tenantId;
    if (!header) {
      return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
    }

    const tenantId = String(header).trim();
    if (!tenantId) {
      return res.status(400).json({ error: 'Invalid X-Tenant-ID header' });
    }

    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Attach tenant context to request
    req.tenantId = tenantId;
    req.tenant = tenant;
    return next();
  } catch (err) {
    console.error('tenantMiddleware error', err);
    return res.status(500).json({ error: 'Tenant validation failed' });
  }
}
