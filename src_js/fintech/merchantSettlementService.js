export function calculateMerchantAllocation({
  grossCustomerPayment = 0,
  paymentProviderFee = 0,
  shoplyCommission = 0,
  refundAdjustments = 0,
  reservedAmount = 0,
  alreadyPaidOut = 0,
} = {}) {
  const gross = Number(grossCustomerPayment) || 0;
  const providerFee = Number(paymentProviderFee) || 0;
  const commission = Number(shoplyCommission) || 0;
  const refunds = Number(refundAdjustments) || 0;
  const reserved = Number(reservedAmount) || 0;
  const paidOut = Number(alreadyPaidOut) || 0;

  const merchantPayable = Math.max(gross - providerFee - commission, 0);
  const pendingBalance = Math.max(merchantPayable - refunds, 0);
  const availableBalance = Math.max(pendingBalance - reserved, 0);

  return {
    grossCustomerPayment: gross,
    paymentProviderFee: providerFee,
    shoplyCommission: commission,
    refundAdjustments: refunds,
    merchantPayable,
    pendingBalance,
    availableBalance,
    reservedAmount: reserved,
    paidOutAmount: paidOut,
    netSettledAmount: Math.max(paidOut, 0),
  };
}

export async function recordMerchantBalanceEntry(db, {
  merchantId = null,
  tenantId = null,
  orderId = null,
  settlementRunId = null,
  entryType = 'payment',
  grossAmount = 0,
  netAmount = 0,
  pendingBalanceDelta = 0,
  availableBalanceDelta = 0,
  paidOutAmountDelta = 0,
  reservedAmountDelta = 0,
  refundAdjustmentDelta = 0,
  notes = null,
} = {}) {
  if (!merchantId) {
    throw new Error('merchantId required');
  }

  if (!db || typeof db !== 'function' && !db.merchant_balance_ledger) {
    return {
      merchantId,
      pendingBalanceDelta: Number(pendingBalanceDelta) || 0,
      availableBalanceDelta: Number(availableBalanceDelta) || 0,
      paidOutAmountDelta: Number(paidOutAmountDelta) || 0,
      persisted: false,
      reason: 'merchant balance ledger unavailable',
    };
  }

  const table = typeof db === 'function' ? db('merchant_balance_ledger') : db.merchant_balance_ledger();
  const payload = {
    merchant_id: merchantId,
    tenant_id: tenantId || null,
    order_id: orderId || null,
    settlement_run_id: settlementRunId || null,
    entry_type: String(entryType || 'payment'),
    gross_amount: Number(grossAmount) || 0,
    net_amount: Number(netAmount) || 0,
    pending_balance_delta: Number(pendingBalanceDelta) || 0,
    available_balance_delta: Number(availableBalanceDelta) || 0,
    paid_out_amount_delta: Number(paidOutAmountDelta) || 0,
    reserved_amount_delta: Number(reservedAmountDelta) || 0,
    refund_adjustment_delta: Number(refundAdjustmentDelta) || 0,
    notes: notes || null,
  };

  const insertResult = table.insert(payload);
  const rows = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || []);
  const [record] = Array.isArray(rows) ? rows : [rows];

  return {
    id: record?.id || null,
    merchantId,
    entryType: payload.entry_type,
    netAmount: Number(record?.net_amount || netAmount || 0),
    persisted: true,
    record: record || null,
  };
}

export async function recordMerchantPaymentAllocation(db, {
  merchantId = null,
  tenantId = null,
  orderId = null,
  grossCustomerPayment = 0,
  paymentProviderFee = 0,
  shoplyCommission = 0,
} = {}) {
  if (!merchantId || !orderId) {
    throw new Error('merchantId and orderId required');
  }

  const write = async (connection) => {
    const existing = await connection('merchant_balance_ledger')
      .where({ order_id: orderId, entry_type: 'payment' })
      .first();

    if (existing) {
      return { id: existing.id, persisted: true, isDuplicate: true };
    }

    const allocation = calculateMerchantAllocation({
      grossCustomerPayment,
      paymentProviderFee,
      shoplyCommission,
    });

    return recordMerchantBalanceEntry(connection, {
      merchantId,
      tenantId,
      orderId,
      entryType: 'payment',
      grossAmount: allocation.grossCustomerPayment,
      netAmount: allocation.merchantPayable,
      pendingBalanceDelta: allocation.pendingBalance,
      availableBalanceDelta: allocation.availableBalance,
      notes: 'Merchant payable created from successful customer payment',
    });
  };

  if (db && typeof db.transaction === 'function') {
    return db.transaction(write);
  }

  return write(db);
}

export function buildMerchantBalanceSnapshot({
  pendingBalance = 0,
  availableBalance = 0,
  paidOutAmount = 0,
  reservedAmount = 0,
  refundAdjustments = 0,
} = {}) {
  const pending = Number(pendingBalance) || 0;
  const available = Number(availableBalance) || 0;
  const paidOut = Number(paidOutAmount) || 0;
  const reserved = Number(reservedAmount) || 0;
  const refunds = Number(refundAdjustments) || 0;

  return {
    pendingBalance: pending,
    availableBalance: available,
    paidOutAmount: paidOut,
    reservedAmount: reserved,
    refundAdjustments: refunds,
    netBalance: pending + available - paidOut - reserved - refunds,
  };
}

export async function createPayoutDestination(db, {
  merchantId = null,
  tenantId = null,
  destinationType = 'bank',
  provider = 'bank',
  maskedIdentifier = '****',
  metadata = {},
  isDefault = true,
} = {}) {
  if (!merchantId) {
    throw new Error('merchantId required');
  }

  if (!db || typeof db !== 'function' && !db.merchant_payout_destinations) {
    return {
      merchantId,
      destinationType: String(destinationType || 'bank'),
      provider: String(provider || 'bank'),
      maskedIdentifier: String(maskedIdentifier || '****'),
      persisted: false,
      reason: 'payout destination store unavailable',
    };
  }

  const table = typeof db === 'function' ? db('merchant_payout_destinations') : db.merchant_payout_destinations();
  const insertResult = table.insert({
    merchant_id: merchantId,
    tenant_id: tenantId || null,
    destination_type: String(destinationType || 'bank'),
    provider: String(provider || 'bank'),
    masked_identifier: String(maskedIdentifier || '****'),
    metadata: metadata || {},
    is_default: Boolean(isDefault),
  });

  const rows = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || []);
  const [record] = Array.isArray(rows) ? rows : [rows];

  return {
    id: record?.id || null,
    merchantId,
    destinationType: record?.destination_type || destinationType || 'bank',
    provider: record?.provider || provider || 'bank',
    maskedIdentifier: record?.masked_identifier || maskedIdentifier || '****',
    persisted: true,
  };
}

function normalizeStatus(status = 'PENDING') {
  return String(status || 'PENDING').toUpperCase();
}

export async function createSettlementRun(db, {
  merchantId = null,
  tenantId = null,
  amount = 0,
  payoutReference = null,
  status = 'ELIGIBLE',
  settlementDate = new Date().toISOString(),
} = {}) {
  if (!merchantId) {
    throw new Error('merchantId required');
  }

  const payoutRef = payoutReference || `payout-${merchantId}-${Date.now()}`;
  const normalizedStatus = normalizeStatus(status);

  if (!db || typeof db.transaction !== 'function') {
    return {
      merchantId,
      amount: Number(amount) || 0,
      payoutReference: payoutRef,
      status: normalizedStatus,
      persisted: false,
      reason: 'database transaction unavailable',
    };
  }

  const result = await db.transaction(async (trx) => {
    const table = trx.merchant_settlement_runs || trx('merchant_settlement_runs');
    const query = typeof table.where === 'function' ? table.where({ merchant_id: merchantId, payout_reference: payoutRef }) : null;
    const existing = query && typeof query.first === 'function' ? await query.first() : null;

    if (existing) {
      return {
        id: existing.id,
        merchantId,
        amount: Number(existing.amount || amount || 0),
        payoutReference: existing.payout_reference || payoutRef,
        status: normalizeStatus(existing.status || normalizedStatus),
        persisted: true,
        isDuplicate: true,
      };
    }

    const insertTable = table && typeof table.insert === 'function' ? table : trx('merchant_settlement_runs');
    const insertResult = insertTable.insert({
      merchant_id: merchantId,
      tenant_id: tenantId || null,
      amount: Number(amount) || 0,
      payout_reference: payoutRef,
      status: normalizedStatus,
      settlement_date: settlementDate,
    });

    const inserted = insertResult && typeof insertResult.returning === 'function'
      ? await insertResult.returning('*')
      : await Promise.resolve(insertResult || []);

    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    return {
      id: row?.id || null,
      merchantId,
      amount: Number(row?.amount || amount || 0),
      payoutReference: row?.payout_reference || payoutRef,
      status: normalizeStatus(row?.status || normalizedStatus),
      persisted: true,
      isDuplicate: false,
    };
  });

  return result;
}

export function createSettlementPolicy({
  frequency = 'DAILY',
  minimumPayout = 0,
  settlementDelayDays = 0,
  currency = 'SZL',
  enabled = true,
} = {}) {
  return {
    frequency: String(frequency || 'DAILY').toUpperCase(),
    minimumPayout: Number(minimumPayout) || 0,
    settlementDelayDays: Number(settlementDelayDays) || 0,
    currency: String(currency || 'SZL').toUpperCase(),
    enabled: Boolean(enabled),
  };
}

export function isSettlementEligible({
  availableBalance = 0,
  minimumPayout = 0,
  settlementDelayDays = 0,
  lastSettledAt = null,
  now = new Date(),
} = {}) {
  const available = Number(availableBalance) || 0;
  const minimum = Number(minimumPayout) || 0;
  const delayDays = Number(settlementDelayDays) || 0;

  if (available < minimum) {
    return { eligible: false, reason: 'below_minimum_payout' };
  }

  if (delayDays > 0 && lastSettledAt) {
    const lastDate = new Date(lastSettledAt);
    const deltaDays = (new Date(now).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (deltaDays < delayDays) {
      return { eligible: false, reason: 'settlement_delay_not_met' };
    }
  }

  return { eligible: true, reason: 'eligible' };
}
