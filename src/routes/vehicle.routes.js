const express = require('express');
const c = require('../controllers/vehicle.controller');
const authenticate = require('../middleware/auth.middleware');
const wrap = require('../utils/wrap');
const { requireRole, ROLES } = require('../middleware/rbac.middleware');
const v = require('../middleware/validator.middleware');

const router = express.Router();
router.use(authenticate);
router.get('/', v.queryValidation, v.validate, wrap(c.list));
router.get('/health-stats', requireRole(ROLES.ADMIN, ROLES.ANALYST), wrap(c.healthStats));
router.get('/:id', v.idParam, v.validate, wrap(c.get));
router.post('/', v.sanitizeInput, v.vehicleValidation, v.validate, wrap(c.create));
router.patch('/:id', v.idParam, v.sanitizeInput, v.vehicleUpdateValidation, v.validate, wrap(c.update));
router.delete('/:id', v.idParam, v.validate, wrap(c.remove));

module.exports = router;
