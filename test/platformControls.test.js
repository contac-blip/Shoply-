import {
  evaluateFraudRisk,
  createSupportTicketSummary,
  escalateFraudCase,
  persistSupportTicketWorkflow,
  persistFraudEscalation,
} from '../src_js/platform/platformControlsService.js';

describe('platform control services', () => {
  test('detects risky behavior', () => {
    const result = evaluateFraudRisk({
      orderTotal: 2500,
      multipleAttempts: 4,
      unusualGeo: true,
      recentChargeback: true,
    });

    expect(result.flagged).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(75);
  });

  test('generates a support ticket summary', () => {
    const summary = createSupportTicketSummary({
      subject: 'Refund issue',
      priority: 'high',
      status: 'open',
    });

    expect(summary.subject).toBe('Refund issue');
    expect(summary.priority).toBe('high');
    expect(summary.status).toBe('open');
  });

  test('escalates a high-risk fraud case to compliance review', () => {
    const result = escalateFraudCase({
      riskScore: 92,
      severity: 'high',
      orderId: 'order-123',
      flagged: true,
    });

    expect(result.escalated).toBe(true);
    expect(result.queue).toBe('compliance-review');
    expect(result.action).toContain('manual review');
  });

  test('persists support ticket and fraud workflow records', async () => {
    const fakeDb = {
      schema: { hasTable: async () => true },
      support_tickets: () => ({
        insert: async () => [{ id: 'ticket-1', user_id: 'user-1', status: 'open', priority: 'high', subject: 'Refund issue' }],
      }),
      ticket_events: () => ({
        insert: async () => [{ id: 'event-1', ticket_id: 'ticket-1', event_type: 'created' }],
      }),
      fraud_flags: () => ({
        insert: async () => [{ id: 'fraud-1', order_id: 'order-123', severity: 'high', is_resolved: false }],
      }),
      risk_reviews: () => ({
        insert: async () => [{ id: 'risk-1', order_id: 'order-123', status: 'pending' }],
      }),
      fraud_audit_logs: () => ({
        insert: async () => [{ id: 'audit-1', order_id: 'order-123', rule: 'risk_score_check' }],
      }),
    };

    const ticket = await persistSupportTicketWorkflow(fakeDb, {
      userId: 'user-1',
      tenantId: 'tenant-1',
      subject: 'Refund issue',
      message: 'Need refund help',
      priority: 'high',
      status: 'open',
    });

    const fraud = await persistFraudEscalation(fakeDb, {
      orderId: 'order-123',
      userId: 'user-1',
      riskScore: 92,
      severity: 'high',
      flagged: true,
      reason: 'High-risk chargeback pattern',
    });

    expect(ticket.persisted).toBe(true);
    expect(ticket.summary.priority).toBe('high');
    expect(fraud.persisted).toBe(true);
    expect(fraud.escalation.queue).toBe('compliance-review');
  });
});
