export function evaluateFraudRisk({
  orderTotal = 0,
  multipleAttempts = 0,
  unusualGeo = false,
  recentChargeback = false,
} = {}) {
  let riskScore = 0;

  if (Number(orderTotal) >= 1000) riskScore += 25;
  if (Number(multipleAttempts) >= 3) riskScore += 25;
  if (unusualGeo) riskScore += 20;
  if (recentChargeback) riskScore += 30;

  const flagged = riskScore >= 60;

  return {
    riskScore,
    flagged,
    reason: flagged ? 'High-risk transaction pattern detected.' : 'No fraud issue detected.',
    severity: flagged ? (riskScore >= 80 ? 'high' : 'medium') : 'low',
  };
}

export function createSupportTicketSummary({
  subject = '',
  priority = 'normal',
  status = 'open',
} = {}) {
  return {
    subject,
    priority,
    status,
    summary: `${status.toUpperCase()} ${priority.toUpperCase()} ticket: ${subject || 'General support request'}`,
  };
}

export function escalateFraudCase({
  riskScore = 0,
  severity = 'low',
  orderId = null,
  flagged = false,
} = {}) {
  const normalizedSeverity = String(severity || '').toLowerCase();
  const shouldEscalate = flagged && (Number(riskScore) >= 80 || normalizedSeverity === 'high');

  return {
    orderId,
    riskScore: Number(riskScore) || 0,
    severity: normalizedSeverity || 'low',
    flagged,
    escalated: shouldEscalate,
    queue: shouldEscalate ? 'compliance-review' : 'standard-review',
    action: shouldEscalate ? 'Place order on hold and trigger manual review workflow.' : 'Continue standard fraud review queue.',
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

export async function persistSupportTicketWorkflow(db, {
  userId = null,
  tenantId = null,
  subject = '',
  message = '',
  priority = 'normal',
  status = 'open',
} = {}) {
  const summary = createSupportTicketSummary({ subject, priority, status });
  const hasTicketsTable = db?.schema?.hasTable ? await db.schema.hasTable('support_tickets') : true;
  if (!hasTicketsTable) {
    return { summary, persisted: false, reason: 'support_tickets table missing' };
  }

  const table = getTableBuilder(db, 'support_tickets');
  if (!table) {
    return { summary, persisted: false, reason: 'support_tickets table unavailable' };
  }

  const insertResult = table.insert({
    user_id: userId,
    tenant_id: tenantId,
    subject,
    message,
    priority,
    status,
  });
  const ticketRows = insertResult && typeof insertResult.returning === 'function'
    ? await insertResult.returning('*')
    : await Promise.resolve(insertResult || []);
  const [ticket] = Array.isArray(ticketRows) ? ticketRows : [ticketRows];

  const eventsTable = getTableBuilder(db, 'ticket_events');
  if (eventsTable && typeof eventsTable.insert === 'function') {
    await eventsTable.insert({
      ticket_id: ticket?.id || null,
      user_id: userId,
      event_type: 'created',
      message: `Ticket created: ${subject}`,
    });
  }

  return {
    persisted: true,
    ticket: ticket || null,
    summary,
  };
}

export async function persistFraudEscalation(db, {
  orderId = null,
  userId = null,
  riskScore = 0,
  severity = 'medium',
  flagged = false,
  reason = '',
} = {}) {
  const escalation = escalateFraudCase({ riskScore, severity, orderId, flagged });
  const hasFraudFlagsTable = db?.schema?.hasTable ? await db.schema.hasTable('fraud_flags') : true;
  if (!hasFraudFlagsTable) {
    return { escalation, persisted: false, reason: 'fraud_flags table missing' };
  }

  const fraudTable = getTableBuilder(db, 'fraud_flags');
  if (!fraudTable) {
    return { escalation, persisted: false, reason: 'fraud_flags table unavailable' };
  }

  await fraudTable.insert({
    order_id: orderId,
    user_id: userId,
    rule: 'risk_score_check',
    severity: escalation.severity,
    details: reason || escalation.action,
    is_resolved: !escalation.escalated,
  });

  const reviewTable = getTableBuilder(db, 'risk_reviews');
  if (reviewTable && typeof reviewTable.insert === 'function') {
    await reviewTable.insert({
      order_id: orderId,
      reviewed_by: userId,
      status: escalation.escalated ? 'pending' : 'cleared',
      notes: reason || escalation.action,
    });
  }

  const auditTable = getTableBuilder(db, 'fraud_audit_logs');
  if (auditTable && typeof auditTable.insert === 'function') {
    await auditTable.insert({
      order_id: orderId,
      user_id: userId,
      rule: 'risk_score_check',
      risk_score: riskScore,
      severity: escalation.severity,
      details: reason || escalation.action,
    });
  }

  return {
    persisted: true,
    escalation,
  };
}
