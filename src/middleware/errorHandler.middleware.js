const { logger } = require('../observability/logger');

class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// Resposta de erro padronizada; nunca expõe stack trace, SQL ou nomes de bibliotecas.
function errorHandler(err, req, res, next) {
  let erro = err;
  if (err.type === 'entity.too.large') erro = new AppError('Payload excede o limite de 10kb', 413, 'PAYLOAD_TOO_LARGE');
  else if (err.type === 'entity.parse.failed') erro = new AppError('JSON malformado', 400, 'MALFORMED_JSON');
  else if (!err.isOperational) {
    logger.error('erro.inesperado', { event: 'app.error', requestId: req.id, path: req.path, message: err.message, stack: err.stack });
    erro = new AppError('Ocorreu um erro inesperado', 500, 'INTERNAL_SERVER_ERROR');
  }

  const corpo = { success: false, error: { code: erro.code, message: erro.message, requestId: req.id } };
  if (erro.details) corpo.error.details = erro.details;
  res.status(erro.statusCode).json(corpo);
}

function notFound(req, res, next) {
  next(new AppError('Recurso não encontrado', 404, 'NOT_FOUND'));
}

module.exports = { AppError, errorHandler, notFound };
