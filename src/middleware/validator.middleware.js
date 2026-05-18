const validator = require('express-validator');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler.middleware');

const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    return str
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors
    });

    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  next();
};

const authValidation = [
  validator.body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email too long'),
  validator.body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number')
];

const registerValidation = [
  validator.body('name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape()
    .withMessage('Name must be 2-100 characters'),
  validator.body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  validator.body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number'),
  validator.body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Invalid phone number'),
  validator.body('role')
    .optional()
    .isIn(['admin', 'analyst', 'user'])
    .withMessage('Invalid role')
];

const vehicleValidation = [
  validator.body('vin')
    .isLength({ min: 17, max: 17 })
    .matches(/^[A-HJ-NPR-Z0-9]{17}$/)
    .withMessage('VIN must be exactly 17 alphanumeric characters'),
  validator.body('brand')
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Brand is required'),
  validator.body('model')
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Model is required'),
  validator.body('year')
    .isInt({ min: 1900, max: 2030 })
    .withMessage('Year must be between 1900 and 2030'),
  validator.body('licensePlate')
    .optional()
    .matches(/^[A-Z]{3}-[0-9]{4}$/)
    .withMessage('License plate must be in format XXX-0000'),
  validator.body('mileage')
    .isInt({ min: 0, max: 1000000 })
    .withMessage('Mileage must be between 0 and 1000000')
];

const queryValidation = [
  validator.query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  validator.query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  validator.query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be asc or desc')
];

module.exports = {
  sanitizeInput,
  validate,
  authValidation,
  registerValidation,
  vehicleValidation,
  queryValidation
};