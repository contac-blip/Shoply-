import {
  calculateMerchantAllocation,
  buildMerchantBalanceSnapshot,
  createSettlementRun,
} from '../src_js/fintech/merchantSettlementService.js';

describe('merchant settlement model', () => {
  test('calculates merchant payable from customer payment, provider fee and commission', () => {
    const allocation = calculateMerchantAllocation({
      grossCustomerPayment: 1000,
      paymentProviderFee: 20,
      shoplyCommission: 50,
    });

    expect(allocation.grossCustomerPayment).toBe(1000);
    expect(allocation.paymentProviderFee).toBe(20);
    expect(allocation.shoplyCommission).toBe(50);
    expect(allocation.merchantPayable).toBe(930);
    expect(allocation.pendingBalance).toBe(930);
    expect(allocation.availableBalance).toBe(930);
    expect(allocation.paidOutAmount).toBe(0);
  });

  test('builds a merchant balance snapshot from auditable ledger values', () => {
    const snapshot = buildMerchantBalanceSnapshot({
      pendingBalance: 930,
      availableBalance: 930,
      paidOutAmount: 850,
      reservedAmount: 200,
      refundAdjustments: 40,
    });

    expect(snapshot.pendingBalance).toBe(930);
    expect(snapshot.availableBalance).toBe(930);
    expect(snapshot.paidOutAmount).toBe(850);
    expect(snapshot.reservedAmount).toBe(200);
    expect(snapshot.refundAdjustments).toBe(40);
    expect(snapshot.netBalance).toBe(930 + 930 - 850 - 200 - 40);
  });

  test('creates an idempotent settlement run with a stable payout reference', async () => {
    const fakeDb = {
      transaction: async (cb) => cb({
        merchant_settlement_runs: {
          where: () => ({
            first: async () => null,
          }),
          insert: async () => [{ id: 'settlement-1', payout_reference: 'payout-1' }],
        },
      }),
    };

    const settlement = await createSettlementRun(fakeDb, {
      merchantId: 'merchant-1',
      amount: 930,
      payoutReference: 'payout-1',
      status: 'ELIGIBLE',
    });

    expect(settlement.persisted).toBe(true);
    expect(settlement.payoutReference).toBe('payout-1');
    expect(settlement.amount).toBe(930);
    expect(settlement.status).toBe('ELIGIBLE');
  });
});
