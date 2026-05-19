const { mockAlerts, getAlertsBySeverity } = require('../../mockData/alerts.mock');
const { mockVehicles } = require('../../mockData/vehicles.mock');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler.middleware');

const getAlerts = async (req, res, next) => {
  try {
    const { vehicleId, severity, isRead, limit = 50, offset = 0, sort = 'desc' } = req.query;

    let alerts = [...mockAlerts];

    if (req.user.role === 'user') {
      const userVehicles = mockVehicles.filter(v => v.userId === req.user.id).map(v => v.id);
      alerts = alerts.filter(a => userVehicles.includes(a.vehicleId));
    }

    if (vehicleId) {
      alerts = alerts.filter(a => a.vehicleId === vehicleId);
    }

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (isRead !== undefined) {
      alerts = alerts.filter(a => a.isRead === (isRead === 'true'));
    }

    if (sort === 'severity') {
      const severityOrder = { critical: 1, high: 2, moderate: 3, low: 4 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    } else {
      alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const limited = alerts.slice(Number(offset), Number(offset) + Number(limit));
    const unreadCount = alerts.filter(a => !a.isRead && !a.isDismissed).length;

    res.status(200).json({
      success: true,
      data: {
        alerts: limited,
        total: alerts.length,
        unreadCount,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + limited.length < alerts.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = mockAlerts.find(a => a.id === id);

    if (!alert) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    const vehicle = mockVehicles.find(v => v.id === alert.vehicleId);
    if (req.user.role === 'user' && vehicle?.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = mockAlerts.find(a => a.id === id);

    if (!alert) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    alert.isRead = true;

    logger.info('Alert marked as read', { alertId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

const dismissAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = mockAlerts.find(a => a.id === id);

    if (!alert) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    alert.isDismissed = true;

    logger.info('Alert dismissed', { alertId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Alert dismissed successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    let alerts = [...mockAlerts];

    if (req.user.role === 'user') {
      const userVehicles = mockVehicles.filter(v => v.userId === req.user.id).map(v => v.id);
      alerts = alerts.filter(a => userVehicles.includes(a.vehicleId));
    }

    const unreadCount = alerts.filter(a => !a.isRead && !a.isDismissed).length;
    const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.isRead && !a.isDismissed).length;

    res.status(200).json({
      success: true,
      data: { unreadCount, criticalCount }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertById,
  markAsRead,
  dismissAlert,
  getUnreadCount
};