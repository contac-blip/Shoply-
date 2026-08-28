export function calculateCommission({ grossSales = 0, commissionRate = 0 } = {}) {
  const total = Number(grossSales) || 0;
  const rate = Number(commissionRate) || 0;

  const commissionAmount = (total * rate) / 100;

  return {
    grossSales: total,
    commissionRate: rate,
    commissionAmount,
    netPayout: Math.max(total - commissionAmount, 0),
  };
}

export function summarizeCommissionLedger(entries = []) {
  return entries.reduce((summary, entry) => {
    const grossSales = Number(entry.gross_sales || 0);
    const rate = Number(entry.commission_rate || 0);

    const commissionAmount = (grossSales * rate) / 100;

    summary.totalGrossSales += grossSales;
    summary.totalCommission += commissionAmount;
    summary.totalNet += Math.max(grossSales - commissionAmount, 0);

    return summary;
  }, {
    totalGrossSales: 0,
    totalCommission: 0,
    totalNet: 0,
  });
}
