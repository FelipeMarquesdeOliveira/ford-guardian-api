const logger = require('./logger');

const DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS) || 90;

const cleanOldData = (dataArray, createdAtField = 'createdAt') => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);

  return dataArray.filter(item => {
    const createdDate = new Date(item[createdAtField]);
    return createdDate > cutoffDate;
  });
};

const DATA_RETENTION_POLICY = {
  users: { retentionDays: 365, anonymize: true },
  vehicles: { retentionDays: 90, anonymize: false },
  alerts: { retentionDays: 60, anonymize: false },
  logs: { retentionDays: 30, anonymize: true }
};

const shouldRetainData = (dataType, createdAt) => {
  const policy = DATA_RETENTION_POLICY[dataType];
  if (!policy) return true;

  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);

  return diffDays < policy.retentionDays;
};

const getAnonymizedLogEntry = (entry) => {
  return {
    timestamp: entry.timestamp,
    action: entry.action,
    resource: entry.resource,
    method: entry.method,
    ip: entry.ip ? entry.ip.substring(0, 3) + '***' : null,
    statusCode: entry.statusCode,
    responseSuccess: entry.responseSuccess
  };
};

module.exports = {
  cleanOldData,
  DATA_RETENTION_POLICY,
  shouldRetainData,
  getAnonymizedLogEntry
};