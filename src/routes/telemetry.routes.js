const express = require('express');
const c = require('../controllers/telemetry.controller');
const wrap = require('../utils/wrap');
const { telemetryValidation, validate } = require('../middleware/validator.middleware');

const router = express.Router();
router.post('/', c.autenticarDispositivo, telemetryValidation, validate, wrap(c.ingest));

module.exports = router;
