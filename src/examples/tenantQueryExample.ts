import express from 'express';
import prisma from '../models/prismaClient';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

// Example route: fetch products for current tenant
router.get('/products', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenantId as string;
    const products = await prisma.product.findMany({ where: { tenant_id: tenantId } });
    return res.json({ ok: true, products });
  } catch (err) {
    console.error('tenant products error', err);
    return res.status(500).json({ error: 'failed to fetch products' });
  }
});

export default router;
