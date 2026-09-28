const express = require('express');
const c = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const wrap = require('../utils/wrap');
const { sanitizeInput, validate, loginValidation, registerValidation, refreshValidation } = require('../middleware/validator.middleware');

module.exports = (authLimiter) => {
  const router = express.Router();
  router.post('/login', authLimiter, sanitizeInput, loginValidation, validate, wrap(c.login));
  router.post('/register', authLimiter, sanitizeInput, registerValidation, validate, wrap(c.register));
  router.post('/refresh', authLimiter, refreshValidation, validate, wrap(c.refresh));
  router.post('/logout', authenticate, wrap(c.logout));
  router.get('/profile', authenticate, wrap(c.profile));
  return router;
};
