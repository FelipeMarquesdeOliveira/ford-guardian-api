const express = require('express');
const c = require('../controllers/privacy.controller');
const authenticate = require('../middleware/auth.middleware');
const wrap = require('../utils/wrap');
const { consentValidation, validate } = require('../middleware/validator.middleware');

const router = express.Router();
router.use(authenticate);
router.get('/me/export', wrap(c.exportar));
router.delete('/me', wrap(c.eliminar));
router.patch('/me/consents', consentValidation, validate, wrap(c.atualizarConsentimentos));

module.exports = router;
