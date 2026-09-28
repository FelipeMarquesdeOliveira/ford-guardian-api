const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler.middleware');
const { registrarEvento } = require('../observability/security-events');

/** Remove caracteres de controle e vetores comuns de XSS de todas as strings recebidas. */
function sanitizeInput(req, res, next) {
  const limpar = (valor) => {
    if (typeof valor === 'string') {
      // remover caracteres de controle é justamente o objetivo desta regex
      // eslint-disable-next-line no-control-regex
      return valor.replace(/[\x00-\x1F\x7F]/g, '').replace(/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gis, '')
        .replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '').trim();
    }
    if (Array.isArray(valor)) return valor.map(limpar);
    if (valor && typeof valor === 'object') {
      for (const chave of Object.keys(valor)) {
        if (chave === '__proto__' || chave === 'constructor' || chave === 'prototype') delete valor[chave];
        else valor[chave] = limpar(valor[chave]);
      }
    }
    return valor;
  };
  limpar(req.body);
  limpar(req.query);
  limpar(req.params);
  next();
}

function validate(req, res, next) {
  const erros = validationResult(req);
  if (erros.isEmpty()) return next();
  const detalhes = erros.array().map(e => ({ field: e.path, message: e.msg }));
  registrarEvento('input.validation.failed', { requestId: req.id, path: req.originalUrl, fields: detalhes.map(d => d.field) }, 'info');
  return next(new AppError('Dados inválidos', 400, 'VALIDATION_ERROR', detalhes));
}

const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const loginValidation = [
  body('email').isEmail().withMessage('E-mail inválido').isLength({ max: 255 }).normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 }).withMessage('Senha obrigatória')
];

const registerValidation = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter 2 a 100 caracteres').escape(),
  body('email').isEmail().withMessage('E-mail inválido').isLength({ max: 255 }).normalizeEmail(),
  body('password').matches(SENHA_FORTE).withMessage('Senha deve ter 8+ caracteres com maiúscula, minúscula, número e símbolo'),
  body('phone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
  body('role').not().exists().withMessage('O perfil não pode ser definido no cadastro')
];

const refreshValidation = [body('refreshToken').isString().isLength({ min: 20, max: 200 }).withMessage('Refresh token inválido')];

const idParam = [param('id').matches(/^[a-z]{3}_[A-Za-z0-9]{1,20}$/).withMessage('Identificador inválido')];

const vehicleValidation = [
  body('vin').matches(/^[A-HJ-NPR-Z0-9]{17}$/).withMessage('VIN deve ter 17 caracteres (ISO 3779)'),
  body('brand').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('model').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('year').isInt({ min: 1990, max: 2030 }).withMessage('Ano inválido'),
  body('licensePlate').optional().matches(/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/).withMessage('Placa inválida'),
  body('mileage').isInt({ min: 0, max: 1000000 }).withMessage('Quilometragem inválida')
];

const vehicleUpdateValidation = [
  body('mileage').optional().isInt({ min: 0, max: 1000000 }).withMessage('Quilometragem inválida'),
  body('licensePlate').optional().matches(/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/).withMessage('Placa inválida'),
  body('healthStatus').optional().isIn(['normal', 'attention', 'critical']).withMessage('Status inválido')
];

const queryValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit deve ser 1-100'),
  query('offset').optional().isInt({ min: 0, max: 10000 }).withMessage('offset inválido'),
  query('sort').optional().isIn(['asc', 'desc', 'severity']).withMessage('sort inválido')
];

const telemetryValidation = [
  body('deviceId').matches(/^obd-[a-z]{3}_[A-Za-z0-9]{1,20}$/).withMessage('deviceId inválido'),
  body('odometerKm').isInt({ min: 0, max: 2000000 }),
  body('engineTempC').isFloat({ min: -40, max: 200 }),
  body('batteryVoltage').isFloat({ min: 0, max: 30 }),
  body('dtcCodes').optional().isArray({ max: 20 }),
  body('dtcCodes.*').optional().matches(/^[PCBU][0-9A-F]{4}$/)
];

const consentValidation = [
  body('telemetry').optional().isBoolean().toBoolean(),
  body('location').optional().isBoolean().toBoolean()
];

module.exports = { sanitizeInput, validate, loginValidation, registerValidation, refreshValidation, idParam,
  vehicleValidation, vehicleUpdateValidation, queryValidation, telemetryValidation, consentValidation };
