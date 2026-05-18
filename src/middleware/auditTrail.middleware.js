const logger = require('../utils/logger');

const AUDIT_ACTIONS = {
  LOGIN: 'USER_LOGIN',
  LOGOUT: 'USER_LOGOUT',
  REGISTER: 'USER_REGISTER',
  CREATE: 'RESOURCE_CREATE',
  UPDATE: 'RESOURCE_UPDATE',
  DELETE: 'RESOURCE_DELETE',
  READ: 'RESOURCE_READ',
  FAILED_AUTH: 'FAILED_AUTH_ATTEMPT',
  SUSPICIOUS: 'SUSPICIOUS_ACTIVITY'
};

const auditTrail = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    const userId = req.user?.id || 'anonymous';
    const action = req.originalUrl.includes('/auth/login') ? AUDIT_ACTIONS.LOGIN :
                   req.originalUrl.includes('/auth/logout') ? AUDIT_ACTIONS.LOGOUT :
                   req.originalUrl.includes('/auth/register') ? AUDIT_ACTIONS.REGISTER :
                   req.method === 'POST' ? AUDIT_ACTIONS.CREATE :
                   req.method === 'PUT' || req.method === 'PATCH' ? AUDIT_ACTIONS.UPDATE :
                   req.method === 'DELETE' ? AUDIT_ACTIONS.DELETE :
                   AUDIT_ACTIONS.READ;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      responseSuccess: res.statusCode >= 200 && res.statusCode < 300
    };

    if (auditEntry.action === AUDIT_ACTIONS.FAILED_AUTH ||
        auditEntry.statusCode === 401 ||
        auditEntry.statusCode === 403) {
      logger.warn('Security event', auditEntry);

      if (auditEntry.action === AUDIT_ACTIONS.FAILED_AUTH ||
          res.statusCode === 401) {
        logger.warn('Failed authentication attempt', {
          email: req.body?.email || 'unknown',
          ip: req.ip,
          path: req.originalUrl
        });
      }
    } else if (action !== AUDIT_ACTIONS.READ || res.statusCode >= 400) {
      logger.info('Audit trail', auditEntry);
    }

    originalSend.call(this, body);
  };

  next();
};

const sanitizeAuditData = (data) => {
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

module.exports = {
  AUDIT_ACTIONS,
  auditTrail,
  sanitizeAuditData
};