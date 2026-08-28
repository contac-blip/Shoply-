import db from '../../config/db.js';

const DEFAULT_PLATFORM_FEE_PERCENT = 0.035; // 3.5%

class LedgerService {
  constructor(platformPercent) {
    this.platformFeePercent = platformPercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
  }

  async processPaymentSplit(tenantId, amountCents, externalRef, metadata = {}) {
    if (!tenantId) throw new Error('tenantId required');
    if (!externalRef) throw new Error('externalRef required for idempotency');

    const platformFee = Math.round(amountCents * this.platformFeePercent);
    const tenantNet = amountCents - platformFee;

    return await db.transaction(async (trx) => {
      // Idempotency check
      const existing = await trx('transactions').where({ external_ref: externalRef }).first();
      if (existing && existing.status === 'COMPLETED') return { status: 'skipped', transactionId: existing.id };

      // Upsert transaction
      let txRow;
      if (existing) {
        await trx('transactions').where({ id: existing.id }).update({ amount_cents: amountCents, status: 'PENDING' });
        txRow = await trx('transactions').where({ id: existing.id }).first();
      } else {
        const insertedTx = await trx('transactions').insert({ tenant_id: tenantId, external_ref: externalRef, amount_cents: amountCents, status: 'PENDING' }).returning('id');
        const id = Array.isArray(insertedTx) ? (insertedTx[0].id || insertedTx[0]) : insertedTx;
        txRow = await trx('transactions').where({ id }).first();
      }

      // Ensure platform account exists
      let platformAccount = await trx('accounts').where({ type: 'PLATFORM' }).first();
      if (!platformAccount) {
        const insertedPlat = await trx('accounts').insert({ type: 'PLATFORM', balance_cents: 0 }).returning('id');
        const id = Array.isArray(insertedPlat) ? (insertedPlat[0].id || insertedPlat[0]) : insertedPlat;
        platformAccount = await trx('accounts').where({ id }).first();
      }

      // Ensure tenant wallet account exists
      let tenantAccount = await trx('accounts').where({ tenant_id: tenantId, type: 'TENANT_WALLET' }).first();
      if (!tenantAccount) {
        const insertedTenantAcc = await trx('accounts').insert({ tenant_id: tenantId, type: 'TENANT_WALLET', balance_cents: 0 }).returning('id');
        const id = Array.isArray(insertedTenantAcc) ? (insertedTenantAcc[0].id || insertedTenantAcc[0]) : insertedTenantAcc;
        tenantAccount = await trx('accounts').where({ id }).first();
      }

      // Create ledger entries
      const insertedPlatEntry = await trx('ledger_entries').insert({ transaction_id: txRow.id, account_id: platformAccount.id, amount_cents: platformFee, direction: 'CREDIT' }).returning('id');
      const platEntryId = Array.isArray(insertedPlatEntry) ? (insertedPlatEntry[0].id || insertedPlatEntry[0]) : insertedPlatEntry;
      const insertedTenantEntry = await trx('ledger_entries').insert({ transaction_id: txRow.id, account_id: tenantAccount.id, amount_cents: tenantNet, direction: 'CREDIT' }).returning('id');
      const tenantEntryId = Array.isArray(insertedTenantEntry) ? (insertedTenantEntry[0].id || insertedTenantEntry[0]) : insertedTenantEntry;

      // Update balances (bigint handling)
      await trx('accounts').where({ id: platformAccount.id }).increment('balance_cents', platformFee);
      await trx('accounts').where({ id: tenantAccount.id }).increment('balance_cents', tenantNet);

      // Mark transaction completed
      await trx('transactions').where({ id: txRow.id }).update({ status: 'COMPLETED' });

      return { status: 'completed', transactionId: txRow.id, platformEntryId: platEntryId, tenantEntryId };
    });
  }

  async handlePaymentConfirmation({ externalRef, tenantId, amountCents }) {
    if (!externalRef) throw new Error('missing externalRef');
    try {
      const existing = await db('transactions').where({ external_ref: externalRef }).first();
      if (existing && existing.status === 'COMPLETED') return { status: 'already_processed' };
      const r = await this.processPaymentSplit(tenantId, amountCents, externalRef, { source: 'momo-webhook' });
      return r;
    } catch (err) {
      console.error('handlePaymentConfirmation failed', err);
      try {
        if (tenantId && externalRef) {
          await db('transactions').where({ external_ref: externalRef }).update({ status: 'FAILED' });
        }
      } catch (e) {
        console.error('failed to mark failed transaction', e);
      }
      return { status: 'error', error: String(err) };
    }
  }
}

export default new LedgerService();
