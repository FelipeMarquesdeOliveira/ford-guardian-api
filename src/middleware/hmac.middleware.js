const crypto = require('crypto');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler.middleware');

const signPayload = (payload) => {
  const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

const verifySignature = (req, res, next) => {
  const signature = req.headers['x-hmac-signature'];

  if (!signature) {
    return next();
  }

  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const expectedSignature = signPayload(payload);

    if (signature !== expectedSignature) {
      logger.warn('Invalid HMAC signature', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      throw new AppError('Invalid payload signature', 401, 'INVALID_SIGNATURE');
    }

    req.signatureValid = true;
    next();
  } catch (error) {
    next(error);
  }
};

const attachSignature = (req, res, next) => {
  const payload = req.method === 'GET' ? req.query : req.body;
  req.generatedSignature = signPayload(payload);
  next();
};

module.exports = {
  signPayload,
  verifySignature,
  attachSignature
};