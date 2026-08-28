import { buildMerchantReportingSummary } from '../src_js/reporting/merchantReportingService.js';

export const getMerchantReporting = async (req, res) => {
  try {
    const { orders = [], currentSummary = {}, returnRequests = [], fraudFlags = [], supportTickets = [] } = req.body;

    const summary = buildMerchantReportingSummary({
      orders,
      currentSummary,
      returnRequests,
      fraudFlags,
      supportTickets,
    });

    return res.json({ summary });
  } catch (error) {
    console.error('Merchant reporting failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
