export function generateInvoice({
  tenantId = null,
  orderId = null,
  amount = 0,
  status = 'draft',
  issuedAt = new Date().toISOString(),
} = {}) {
  const total = Number(amount) || 0;

  return {
    tenantId,
    orderId,
    amount: total,
    status,
    issuedAt,
  };
}

export function reconcilePayout({
  grossSales = 0,
  commissionRate = 0,
  refundAmount = 0,
  processingFees = 0,
} = {}) {
  const gross = Number(grossSales) || 0;
  const rate = Number(commissionRate) || 0;
  const refunds = Number(refundAmount) || 0;
  const fees = Number(processingFees) || 0;

  const commissionAmount = (gross * rate) / 100;
  const netRevenue = Math.max(gross - refunds - fees, 0);
  const payoutAmount = Math.max(netRevenue - commissionAmount, 0);

  return {
    grossSales: gross,
    commissionAmount,
    refundAmount: refunds,
    processingFees: fees,
    netRevenue,
    payoutAmount,
    status: payoutAmount > 0 ? 'ready_for_settlement' : 'not_due',
  };
}

export function summarizeSettlementLedger(entries = []) {
  return entries.reduce((summary, entry) => {
    const amount = Number(entry.amount || 0);
    const status = entry.status || 'pending';

    summary.totalAmount += amount;
    if (status === 'settled') summary.settledAmount += amount;
    if (status === 'pending') summary.pendingAmount += amount;

    return summary;
  }, {
    totalAmount: 0,
    settledAmount: 0,
    pendingAmount: 0,
  });
}

export function reconcilePaymentLedger({
  capturedAmount = 0,
  creditedAmount = 0,
  refundedAmount = 0,
  fees = 0,
} = {}) {
  const captured = Number(capturedAmount) || 0;
  const credited = Number(creditedAmount) || 0;
  const refunded = Number(refundedAmount) || 0;
  const feeTotal = Number(fees) || 0;

  const mismatch = Math.abs(captured - credited) > 0.01;
  const netSettlement = Math.max(credited - refunded - feeTotal, 0);

  return {
    capturedAmount: captured,
    creditedAmount: credited,
    refundedAmount: refunded,
    fees: feeTotal,
    mismatch,
    netSettlement,
    status: mismatch ? 'needs_review' : 'reconciled',
  };
}

function getTableBuilder(db, tableName) {
  if (typeof db === 'function') {
    return db(tableName);
  }

  const tableBuilder = db?.[tableName];
  if (typeof tableBuilder === 'function') {
    return tableBuilder(tableName);
  }

  return null;
}

export async function persistInvoiceRecord(db, {
  tenantId = null,
  orderId = null,
  amount = 0,
  status = 'draft',
  issuedAt = new Date().toISOString(),
} = {}) {
  const invoice = generateInvoice({
    tenantId,
    orderId,
    amount,
    status,
    issuedAt,
  });

  const hasInvoicesTable = db?.schema?.hasTable ? await db.schema.hasTable('invoices') : true;
  if (!hasInvoicesTable) {
    return { ...invoice, persisted: false, reason: 'invoices table missing' };
  }

  const table = getTableBuilder(db, 'invoices');
  if (!table) {
    return { ...invoice, persisted: false, reason: 'invoice table unavailable' };
  }

  const insertResult = typeof table.insert === 'function'
    ? table.insert({
        tenant_id: tenantId,
        order_id: orderId,
        amount: invoice.amount,
        status: invoice.status,
        issued_at: invoice.issuedAt,
      })
    : null;

  const [record] = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || [{
        id: null,
        tenant_id: tenantId,
        order_id: orderId,
        amount: invoice.amount,
        status: invoice.status,
      }]);

  return {
    ...invoice,
    persisted: true,
    record: record || null,
  };
}

export async function persistSettlementRecord(db, {
  tenantId = null,
  amount = 0,
  status = 'pending',
  settledAt = null,
} = {}) {
  const hasSettlementsTable = db?.schema?.hasTable ? await db.schema.hasTable('settlements') : true;
  if (!hasSettlementsTable) {
    return { tenantId, amount, status, persisted: false, reason: 'settlements table missing' };
  }

  const table = getTableBuilder(db, 'settlements');
  if (!table) {
    return { tenantId, amount, status, persisted: false, reason: 'settlement table unavailable' };
  }

  const insertResult = typeof table.insert === 'function'
    ? table.insert({
        tenant_id: tenantId,
        amount,
        status,
        settled_at: settledAt,
      })
    : null;

  const [record] = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || [{
        id: null,
        tenant_id: tenantId,
        amount,
        status,
      }]);

  return {
    id: record?.id || null,
    tenantId,
    amount: Number(record?.amount || amount || 0),
    status: record?.status || status,
    persisted: true,
    record: record || null,
  };
}

export async function recordOrderLoyaltyRedemption(db, {
  userId = null,
  tenantId = null,
  orderId = null,
  pointsUsed = 0,
  discountAmount = 0,
  orderTotal = 0,
  status = 'recorded',
} = {}) {
  const hasRedemptionsTable = db?.schema?.hasTable ? await db.schema.hasTable('loyalty_redemptions') : true;
  if (!hasRedemptionsTable) {
    return {
      persisted: false,
      userId,
      orderId,
      pointsUsed,
      discountAmount,
      orderTotal,
      status,
      reason: 'loyalty_redemptions table missing',
    };
  }

  const table = getTableBuilder(db, 'loyalty_redemptions');
  if (!table) {
    return {
      persisted: false,
      userId,
      orderId,
      pointsUsed,
      discountAmount,
      orderTotal,
      status,
      reason: 'loyalty_redemptions table unavailable',
    };
  }

  const insertResult = typeof table.insert === 'function'
    ? table.insert({
        user_id: userId,
        tenant_id: tenantId,
        order_id: orderId,
        points_used: Number(pointsUsed) || 0,
        discount_amount: Number(discountAmount) || 0,
        status,
      })
    : null;

  const [record] = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || [{
        id: null,
        user_id: userId,
        order_id: orderId,
        points_used: Number(pointsUsed) || 0,
        discount_amount: Number(discountAmount) || 0,
        status,
      }]);

  return {
    persisted: true,
    id: record?.id || null,
    userId,
    orderId,
    pointsUsed: Number(record?.points_used || pointsUsed || 0),
    discountAmount: Number(record?.discount_amount || discountAmount || 0),
    orderTotal: Number(record?.order_total || orderTotal || 0),
    status: record?.status || status,
    record: record || null,
  };
}
