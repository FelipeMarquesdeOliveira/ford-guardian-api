const logger = require('../utils/logger');
const { AppError } = require('./errorHandler.middleware');

const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  USER: 'user'
};

const PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'update', 'manage'],
  analyst: ['read', 'write'],
  user: ['read']
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      throw new AppError(
        'Access denied. Insufficient permissions.',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    const userPermissions = PERMISSIONS[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermission: permission,
        path: req.path
      });
      throw new AppError(
        'Access denied. Required permission not found.',
        403,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
};

module.exports = {
  ROLES,
  PERMISSIONS,
  requireRole,
  requirePermission
};