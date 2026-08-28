import db from '../config/db.js';

export const getWalletHistory = async (req, res) => {
  try {
    const rows = await db('loyalty_points')
      .where({ user_id: req.user.id })
      .modify((query) => {
        if (req.tenantId) query.where({ tenant_id: req.tenantId });
      })
      .orderBy('created_at', 'desc');

    const balance = rows.reduce((total, row) => total + Number(row.points || 0), 0);
    res.json({
      balance,
      history: rows.map((row) => ({
        id: row.id,
        amount: Number(row.points || 0),
        reason: row.reason,
        source_type: row.source_type,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load wallet history' });
  }
};
