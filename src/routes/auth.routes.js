const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const { authValidation, registerValidation, sanitizeInput, validate } = require('../middleware/validator.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { verifySignature } = require('../middleware/hmac.middleware');

router.post('/login',
  authLimiter,
  sanitizeInput,
  authValidation,
  validate,
  verifySignature,
  authController.login
);

router.post('/register',
  sanitizeInput,
  registerValidation,
  validate,
  verifySignature,
  authController.register
);

router.post('/refresh',
  authController.refreshToken
);

router.post('/logout',
  authenticate,
  authController.logout
);

router.get('/profile',
  authenticate,
  authController.getProfile
);

module.exports = router;