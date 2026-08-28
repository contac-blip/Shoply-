import db from '../config/db.js';

export const getMerchantProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const merchant = await db('merchants').where({ user_id: userId }).first();
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    const stores = await db('merchant_stores')
      .where({ merchant_id: merchant.merchant_id, tenant_id: req.tenantId })
      .select('*');

    return res.json({
      merchant,
      stores,
    });
  } catch (error) {
    console.error('Failed to load merchant profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const upsertMerchantProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { business_name, status = 'pending', kyc_data = {} } = req.body || {};
    if (!business_name || !String(business_name).trim()) {
      return res.status(400).json({ message: 'Business name is required' });
    }

    const existing = await db('merchants').where({ user_id: userId }).first();

    const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
    const requestedStatus = isAdmin ? String(status).trim() || 'pending' : 'pending';
    let merchant;
    if (existing) {
      const [updated] = await db('merchants')
        .where({ user_id: userId })
        .update({
          business_name: String(business_name).trim(),
          status: isAdmin ? requestedStatus : existing.status,
          kyc_data: kyc_data || {},
          updated_at: db.fn.now(),
        })
        .returning('*');
      merchant = updated;
    } else {
      const [created] = await db('merchants')
        .insert({
          user_id: userId,
          business_name: String(business_name).trim(),
          status: requestedStatus,
          kyc_data: kyc_data || {},
        })
        .returning('*');
      merchant = created;
    }

    await db('merchant_stores')
      .insert({
        merchant_id: merchant.merchant_id,
        tenant_id: req.tenantId,
        role: 'owner',
      })
      .onConflict(['merchant_id', 'tenant_id'])
      .ignore();

    return res.status(existing ? 200 : 201).json({
      message: existing ? 'Merchant profile updated' : 'Merchant profile created',
      merchant,
    });
  } catch (error) {
    console.error('Failed to save merchant profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
