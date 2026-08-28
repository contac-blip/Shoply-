import db from '../config/db.js';
import {
  buildMerchantBalanceSnapshot,
  createSettlementRun,
  createPayoutDestination,
  recordMerchantBalanceEntry,
} from '../src_js/fintech/merchantSettlementService.js';

async function getMerchantId(req) {
  if (String(req.user?.role || '').toLowerCase() === 'admin' && req.body?.merchant_id) {
    return req.body.merchant_id;
  }

  const merchant = await db('merchants').where({ user_id: req.user.id }).first();
  return merchant?.merchant_id || null;
}

export const getMerchantBalance = async (req, res) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) return res.status(404).json({ message: 'Merchant profile not found' });

    const totals = await db('merchant_balance_ledger')
      .where({ merchant_id: merchantId, tenant_id: req.tenantId })
      .sum({
        pending: 'pending_balance_delta',
        available: 'available_balance_delta',
        paidOut: 'paid_out_amount_delta',
        reserved: 'reserved_amount_delta',
        refunds: 'refund_adjustment_delta',
      })
      .first();

    return res.json({
      merchantId,
      tenantId: req.tenantId,
      balance: buildMerchantBalanceSnapshot({
        pendingBalance: totals?.pending,
        availableBalance: totals?.available,
        paidOutAmount: totals?.paidOut,
        reservedAmount: totals?.reserved,
        refundAdjustments: totals?.refunds,
      }),
    });
  } catch (error) {
    console.error('Merchant balance lookup failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createMerchantSettlement = async (req, res) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) return res.status(404).json({ message: 'Merchant profile not found' });

    const totals = await db('merchant_balance_ledger')
      .where({ merchant_id: merchantId, tenant_id: req.tenantId })
      .sum({ available: 'available_balance_delta' })
      .first();
    const available = Number(totals?.available || 0);
    const amount = Number(req.body?.amount ?? available);

    if (!Number.isFinite(amount) || amount <= 0 || amount > available) {
      return res.status(400).json({ message: 'Settlement amount exceeds available balance' });
    }

    const settlement = await createSettlementRun(db, {
      merchantId,
      tenantId: req.tenantId,
      amount,
      payoutReference: req.body?.payout_reference,
      status: 'ELIGIBLE',
    });

    if (!settlement.isDuplicate) {
      await recordMerchantBalanceEntry(db, {
        merchantId,
        tenantId: req.tenantId,
        settlementRunId: settlement.id,
        entryType: 'settlement_reservation',
        netAmount: amount,
        availableBalanceDelta: -amount,
        reservedAmountDelta: amount,
        notes: 'Amount reserved for merchant settlement',
      });
    }

    return res.status(settlement.isDuplicate ? 200 : 201).json({ settlement });
  } catch (error) {
    console.error('Merchant settlement creation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getMerchantPayoutDestination = async (req, res) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) return res.status(404).json({ message: 'Merchant profile not found' });

    const destination = await db('merchant_payout_destinations')
      .where({ merchant_id: merchantId, tenant_id: req.tenantId, is_default: true })
      .first();
    return res.json(destination || null);
  } catch (error) {
    console.error('Merchant payout destination lookup failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const saveMerchantPayoutDestination = async (req, res) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) return res.status(404).json({ message: 'Merchant profile not found' });

    const maskedIdentifier = String(req.body?.masked_identifier || '').trim();
    if (!maskedIdentifier) {
      return res.status(400).json({ message: 'Masked payout identifier is required' });
    }

    await db('merchant_payout_destinations')
      .where({ merchant_id: merchantId, tenant_id: req.tenantId })
      .update({ is_default: false, updated_at: db.fn.now() });

    const destination = await createPayoutDestination(db, {
      merchantId,
      tenantId: req.tenantId,
      destinationType: req.body?.destination_type,
      provider: req.body?.provider,
      maskedIdentifier,
      metadata: req.body?.metadata,
      isDefault: true,
    });
    return res.status(201).json({ destination });
  } catch (error) {
    console.error('Merchant payout destination save failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
