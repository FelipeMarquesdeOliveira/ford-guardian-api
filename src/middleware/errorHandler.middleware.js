const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.isOperational ? err.message : 'An unexpected error occurred'
    }
  };

  if (process.env.NODE_ENV === 'development' && !err.isOperational) {
    response.error.stack = err.stack;
  }

  logger.error(`${err.statusCode} - ${err.message}`, {
    statusCode: err.statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(err.statusCode).json(response);
};

module.exports = {
  AppError,
  errorHandler
};