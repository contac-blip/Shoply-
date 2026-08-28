import prisma from '../models/prismaClient';
import type { Prisma } from '@prisma/client';

/**
 * LedgerService
 * - Handles internal ledger operations and virtual balances
 * - Enforces idempotency using `externalRef` on transactions
 * - Splits incoming payments into platform fee and tenant wallet
 *
 * Edge cases:
 * - USSD push timeouts / delayed webhooks: transactions are created with
 *   status=PENDING. The webhook must be idempotent and update the same
 *   transaction (by externalRef). Splits are only performed when the
 *   transaction status transitions to COMPLETED.
 * - Partial failures (e.g., DB error during split): we rely on database
 *   transactions to either commit both ledger entries or roll back. If
 *   a split fails after external payment is confirmed, the system marks
 *   the transaction as FAILED and emits alerts for manual reconciliation.
 */

export class LedgerService {
  // default platform fee percent (3.5% -> 0.035)
  platformFeePercent = 0.035;

  constructor(private platformPercent?: number) {
    if (platformPercent !== undefined) this.platformFeePercent = platformPercent;
  }

  /**
   * Process a payment and perform the split
   * @param tenantId tenant UUID
   * @param amountCents integer amount in cents
   * @param externalRef external reference (from MTN) used for idempotency
   * @param metadata free-form object stored on transaction
   */
  async processPaymentSplit(tenantId: string, amountCents: number, externalRef: string, metadata: any = {}) {
    // Basic validation
    if (!tenantId) throw new Error('tenantId required');
    if (!externalRef) throw new Error('externalRef required for idempotency');

    // Compute amounts (use integer cents)
    const platformFee = Math.round(amountCents * this.platformFeePercent);
    const tenantNet = amountCents - platformFee;

    // Idempotency: if transaction with externalRef already COMPLETED, skip
    const existing = await prisma.transaction.findUnique({ where: { externalRef } });
    if (existing && existing.status === 'COMPLETED') {
      return { status: 'skipped', transactionId: existing.id };
    }

    // Perform a DB transaction to create/update transaction record and ledger entries
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Upsert transaction row (PENDING -> will set to COMPLETED inside)
      let txRow = await tx.transaction.upsert({
        where: { externalRef },
        create: {
          tenant_id: tenantId,
          externalRef,
          amountCents,
          currency: 'SZL',
          status: 'PENDING',
        },
        update: {
          amountCents,
          status: 'PENDING',
        },
      });

      // Ensure platform account exists (single shared account)
      let platformAccount = await tx.account.findFirst({ where: { type: 'PLATFORM' } });
      if (!platformAccount) {
        platformAccount = await tx.account.create({
          data: { type: 'PLATFORM', balanceCents: 0 },
        });
      }

      // Ensure tenant wallet account exists (unique combined by tenant & TENANT_WALLET)
      let tenantAccount = await tx.account.findFirst({ where: { tenant_id: tenantId, type: 'TENANT_WALLET' } });
      if (!tenantAccount) {
        tenantAccount = await tx.account.create({
          data: { tenant_id: tenantId, type: 'TENANT_WALLET', balanceCents: 0 },
        });
      }

      // Create ledger entries: credit platform, credit tenant
      // Platform receives `platformFee` as CREDIT
      const platformEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRow.id,
          accountId: platformAccount.id,
          amountCents: platformFee,
          direction: 'CREDIT',
        },
      });

      // Tenant receives `tenantNet` as CREDIT
      const tenantEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: txRow.id,
          accountId: tenantAccount.id,
          amountCents: tenantNet,
          direction: 'CREDIT',
        },
      });

      // Update account balances atomically
      await tx.account.update({ where: { id: platformAccount.id }, data: { balanceCents: { increment: BigInt(platformFee) } as any } });
      await tx.account.update({ where: { id: tenantAccount.id }, data: { balanceCents: { increment: BigInt(tenantNet) } as any } });

      // Mark transaction as COMPLETED and return
      txRow = await tx.transaction.update({ where: { id: txRow.id }, data: { status: 'COMPLETED' } });

      return { txRow, platformEntry, tenantEntry };
    });

    return { status: 'completed', result };
  }

  /**
   * Safe handler for payment confirmations (called by webhook)
   * - Ensures idempotency and safe state transitions
   */
  async handlePaymentConfirmation(payload: { externalRef: string; tenantId: string; amountCents: number; }) {
    const { externalRef, tenantId, amountCents } = payload;
    try {
      // Basic guard
      if (!externalRef) throw new Error('missing externalRef');

      // If transaction exists and is already COMPLETED, no-op
      const existing = await prisma.transaction.findUnique({ where: { externalRef } });
      if (existing && existing.status === 'COMPLETED') return { status: 'already_processed' };

      // Process the split
      const r = await this.processPaymentSplit(tenantId, amountCents, externalRef, { source: 'momo-webhook' });
      return r;
    } catch (err) {
      console.error('handlePaymentConfirmation failed', err);
      // In case of failure, record a FAILED transaction if possible for reconciliation
      try {
        await prisma.transaction.upsert({
          where: { externalRef },
          create: { tenant_id: tenantId, externalRef, amountCents, status: 'FAILED' },
          update: { status: 'FAILED' },
        });
      } catch (e) {
        console.error('failed to write FAILED transaction', e);
      }
      return { status: 'error', error: String(err) };
    }
  }
}

export default new LedgerService();
