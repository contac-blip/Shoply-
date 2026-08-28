import db from '../config/db.js';
import logger from './logger.js';

export const logActivity = async (req, action, resource, resourceId = null, oldValue = null, newValue = null) => {
  try {
    if (!req || !action || !resource) {
      return;
    }

    const payload = {
      user_id: req.user ? req.user.id : null,
      tenant_id: req.tenantId || req.tenant?.id || null,
      request_id: req.id || null,
      action,
      resource,
      resource_id: resourceId,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      ip_address: req.ip || null,
      user_agent: req.headers ? req.headers['user-agent'] : null,
    };

    if (typeof db === 'function' && typeof db('audit_logs')?.insert === 'function') {
      await db('audit_logs').insert(payload);
      return;
    }

    logger.info('Audit event skipped because DB adapter is unavailable', { payload });
  } catch (err) {
    logger.error('Failed to log audit activity:', err);
  }
};
