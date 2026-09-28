const rateLimit = require('express-rate-limit');
const { registrarEvento } = require('../observability/security-events');

function criarLimiter({ windowMs, max, code, message, nome }) {
  return rateLimit({
    windowMs, max, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (req, res) => {
      registrarEvento('ratelimit.exceeded', { requestId: req.id, ip: req.ip, path: req.originalUrl, limiter: nome });
      res.status(429).json({ success: false, error: { code, message, requestId: req.id } });
    }
  });
}

module.exports = { criarLimiter };
