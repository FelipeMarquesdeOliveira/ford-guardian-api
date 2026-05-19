const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', alertController.getAlerts);
router.get('/unread-count', alertController.getUnreadCount);
router.get('/:id', alertController.getAlertById);
router.patch('/:id/read', alertController.markAsRead);
router.patch('/:id/dismiss', alertController.dismissAlert);

module.exports = router;