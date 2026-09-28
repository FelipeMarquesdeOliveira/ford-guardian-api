const express = require('express');
const c = require('../controllers/alert.controller');
const authenticate = require('../middleware/auth.middleware');
const wrap = require('../utils/wrap');
const { idParam, validate } = require('../middleware/validator.middleware');

const router = express.Router();
router.use(authenticate);
router.get('/', wrap(c.list));
router.get('/:id', idParam, validate, wrap(c.get));
router.patch('/:id/read', idParam, validate, wrap(c.markAsRead));
router.patch('/:id/dismiss', idParam, validate, wrap(c.dismiss));

module.exports = router;
