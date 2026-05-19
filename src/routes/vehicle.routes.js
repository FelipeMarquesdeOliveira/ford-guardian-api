const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authenticate = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { vehicleValidation, queryValidation, sanitizeInput, validate } = require('../middleware/validator.middleware');

router.use(authenticate);

router.get('/', queryValidation, validate, vehicleController.getVehicles);

router.get('/health-stats', requireRole('admin', 'analyst'), vehicleController.getHealthStats);

router.get('/:id', vehicleController.getVehicleById);

router.post('/', sanitizeInput, vehicleValidation, validate, vehicleController.createVehicle);

router.put('/:id', sanitizeInput, vehicleController.updateVehicle);

router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;