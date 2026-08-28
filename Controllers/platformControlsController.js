import db from '../config/db.js';
import {
  evaluateFraudRisk,
  createSupportTicketSummary,
  persistSupportTicketWorkflow,
  persistFraudEscalation,
} from '../src_js/platform/platformControlsService.js';

export const checkFraudRisk = async (req, res) => {
  try {
    const { order_id, order_total, multiple_attempts, unusual_geo, recent_chargeback } = req.body;

    const risk = evaluateFraudRisk({
      orderTotal: order_total,
      multipleAttempts: multiple_attempts,
      unusualGeo: Boolean(unusual_geo),
      recentChargeback: Boolean(recent_chargeback),
    });

    let persisted = null;
    if (order_id) {
      persisted = await persistFraudEscalation(db, {
        orderId: order_id,
        userId: req.body.user_id || null,
        riskScore: risk.riskScore,
        severity: risk.severity,
        flagged: risk.flagged,
        reason: risk.reason,
      });
    }

    return res.json({
      ...risk,
      order_id: order_id || null,
      persisted,
    });
  } catch (error) {
    console.error('Fraud check failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createSupportTicket = async (req, res) => {
  try {
    const { user_id, tenant_id, subject, message, priority = 'normal', status = 'open' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'subject and message are required' });
    }

    const persisted = await persistSupportTicketWorkflow(db, {
      userId: user_id || null,
      tenantId: tenant_id || null,
      subject,
      message,
      priority,
      status,
    });

    return res.status(201).json({
      message: 'Support ticket created',
      ticket: persisted.ticket,
      summary: persisted.summary,
      persisted,
    });
  } catch (error) {
    console.error('Support ticket creation failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
