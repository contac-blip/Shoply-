import db from '../config/db.js';
import { calculateCommission } from '../src_js/billing/commissionService.js';

export const createCommissionEntry = async (req, res) => {
  try {
    const { tenant_id, gross_sales = 0, commission_rate = 0 } = req.body;

    const commission = calculateCommission({ grossSales: gross_sales, commissionRate: commission_rate });

    const [entry] = await db('commission_entries').insert({
      tenant_id,
      gross_sales: commission.grossSales,
      commission_rate: commission.commissionRate,
      commission_amount: commission.commissionAmount,
      net_payout: commission.netPayout,
    }).returning('*');

    return res.status(201).json({ message: 'Commission entry created', entry, commission });
  } catch (error) {
    console.error('Commission entry creation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listCommissionEntries = async (req, res) => {
  try {
    const entries = await db('commission_entries').orderBy('created_at', 'desc');
    return res.json(entries);
  } catch (error) {
    console.error('Commission listing failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
