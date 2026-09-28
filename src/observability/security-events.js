const { logger } = require('./logger');
const { securityEvents } = require('./metrics');

const NIVEL = { info: 'info', warn: 'warn', error: 'error' };

/**
 * Registra um evento de segurança como log estruturado e incrementa a métrica correspondente.
 * Os campos passam pela redação automática do logger (sem senha, token, telefone...).
 */
function registrarEvento(evento, campos = {}, nivel = 'warn') {
  securityEvents.inc({ event: evento });
  logger.log(NIVEL[nivel] || 'warn', evento, { event: evento, ...campos });
}

module.exports = { registrarEvento };
