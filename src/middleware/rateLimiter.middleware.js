const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(options.message.status).json(options.message);
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body.email || 'unknown'
    });
    res.status(options.message.status).json(options.message);
  }
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please slow down.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  standardLimiter,
  authLimiter,
  searchLimiter
};