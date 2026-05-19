const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealer.controller');
const authenticate = require('../middleware/auth.middleware');
const { searchLimiter } = require('../middleware/rateLimiter.middleware');

router.use(authenticate);

router.get('/', dealerController.getDealers);
router.get('/search', searchLimiter, dealerController.searchDealers);
router.get('/nearby', dealerController.getNearbyDealers);
router.get('/:id', dealerController.getDealerById);

module.exports = router;