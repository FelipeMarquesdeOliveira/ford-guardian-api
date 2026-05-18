const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler.middleware');

const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Access denied. No token provided.', 401, 'NO_TOKEN');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired token used', { email: req.body.email });
      throw new AppError('Token expired. Please login again.', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token used', { path: req.path });
      throw new AppError('Invalid token.', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
};

module.exports = authenticate;