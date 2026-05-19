const express = require('express');
const router = express.Router();
const securityMonitor = require('../utils/securityMonitor').securityMonitor;
const logger = require('../utils/logger');

router.get('/status', (req, res) => {
  const status = securityMonitor.getSecurityStatus();

  res.status(200).json({
    success: true,
    data: status
  });
});

router.get('/alerts', (req, res) => {
  const { limit = 50 } = req.query;
  const alerts = securityMonitor.getSecurityStatus().recentAlerts.slice(0, Number(limit));

  res.status(200).json({
    success: true,
    data: alerts
  });
});

router.post('/clear', (req, res) => {
  const { maxAge } = req.body;

  securityMonitor.clearOldRecords(maxAge || 24 * 60 * 60 * 1000);

  logger.info('Security monitor records cleared', { maxAge });

  res.status(200).json({
    success: true,
    message: 'Records cleared successfully'
  });
});

module.exports = router;