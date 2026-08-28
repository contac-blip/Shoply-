import db from '../config/db.js';

export const validatePromoCode = async (req, res) => {
  const { code, order_amount } = req.body;

  try {
    const promo = await db('promo_codes')
      .where({ code, is_active: true })
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      })
      .first();

    if (!promo) {
      return res.status(404).json({ message: 'Invalid or expired promo code' });
    }

    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return res.status(400).json({ message: 'Promo code usage limit reached' });
    }

    if (order_amount < promo.min_order_amount) {
      return res.status(400).json({ message: `Minimum order amount of ${promo.min_order_amount} required` });
    }

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = (order_amount * promo.value) / 100;
    } else {
      discount = promo.value;
    }

    res.json({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount_amount: Math.min(discount, order_amount)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to validate promo code' });
  }
};
