const logger = require('../utils/logger');

class SecurityMonitor {
  constructor() {
    this.failedAttempts = new Map();
    this.suspiciousPatterns = [];
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000;
  }

  recordFailedAttempt(identifier, ip) {
    const key = `${identifier || 'unknown'}_${ip}`;
    const attempts = this.failedAttempts.get(key) || { count: 0, firstAttempt: Date.now() };

    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(key, attempts);

    if (attempts.count >= this.maxFailedAttempts) {
      this.triggerAlert('EXCESSIVE_AUTH_FAILURES', { identifier, ip, attempts: attempts.count });

      const lockoutUntil = attempts.firstAttempt + this.lockoutDuration;
      if (Date.now() < lockoutUntil) {
        return {
          locked: true,
          unlockAt: new Date(lockoutUntil).toISOString(),
          remainingMinutes: Math.ceil((lockoutUntil - Date.now()) / 60000)
        };
      }
    }

    return { locked: false };
  }

  recordSuccessfulLogin(identifier, ip) {
    const key = `${identifier}_${ip}`;
    this.failedAttempts.delete(key);
  }

  triggerAlert(type, details) {
    logger.warn('Security alert triggered', { alertType: type, ...details });

    if (type === 'EXCESSIVE_AUTH_FAILURES') {
      logger.warn('Account lockout triggered due to failed attempts', details);
    }

    if (type === 'ANOMALY_DETECTED') {
      logger.warn('Anomalous behavior detected', details);
    }

    if (type === 'DATA_ACCESS_ANOMALY') {
      logger.warn('Unusual data access pattern', details);
    }

    this.suspiciousPatterns.push({ type, timestamp: new Date().toISOString(), details });
  }

  detectAnomaly(userId, action, frequency) {
    if (frequency > 100) {
      this.triggerAlert('ANOMALY_DETECTED', { userId, action, frequency, message: 'Unusual high frequency of actions detected' });
      return true;
    }
    return false;
  }

  checkDataAccessPattern(userId, accessedResources, timeWindow) {
    const accessCount = accessedResources.length;
    const threshold = 50;

    if (accessCount > threshold) {
      this.triggerAlert('DATA_ACCESS_ANOMALY', { userId, accessedResources: accessCount, timeWindow, message: 'Mass data access detected' });
      return true;
    }
    return false;
  }

  getSecurityStatus() {
    return {
      activeLockouts: this.failedAttempts.size,
      suspiciousAlerts: this.suspiciousPatterns.length,
      recentAlerts: this.suspiciousPatterns.slice(-10)
    };
  }

  clearOldRecords(maxAge = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAge;

    this.failedAttempts.forEach((value, key) => {
      if (value.lastAttempt < cutoff) {
        this.failedAttempts.delete(key);
      }
    });

    this.suspiciousPatterns = this.suspiciousPatterns.filter(
      p => new Date(p.timestamp).getTime() > cutoff
    );
  }
}

const securityMonitor = new SecurityMonitor();

module.exports = { SecurityMonitor, securityMonitor };