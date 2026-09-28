const express = require('express');
const c = require('../controllers/dealer.controller');
const authenticate = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validator.middleware');

module.exports = (searchLimiter) => {
  const router = express.Router();
  router.use(authenticate, sanitizeInput);
  router.get('/', c.getDealers);
  router.get('/search', searchLimiter, c.searchDealers);
  router.get('/nearby', searchLimiter, c.getNearbyDealers);
  router.get('/:id', c.getDealerById);
  return router;
};
