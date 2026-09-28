const winston = require('winston');
const config = require('../config');

// Campos que nunca podem aparecer em log (LGPD / OWASP Logging Cheat Sheet)
const SENSIVEIS = new Set(['password', 'senha', 'token', 'accesstoken', 'refreshtoken', 'authorization',
  'secret', 'cookie', 'signature', 'phone', 'telefone', 'licenseplate', 'cpf']);

function redigir(valor, profundidade = 0) {
  if (valor === null || typeof valor !== 'object' || profundidade > 5) return valor;
  if (Array.isArray(valor)) return valor.map(v => redigir(v, profundidade + 1));
  const saida = {};
  for (const [chave, v] of Object.entries(valor)) {
    saida[chave] = SENSIVEIS.has(chave.toLowerCase()) ? '[REDACTED]' : redigir(v, profundidade + 1);
  }
  return saida;
}

const formatoRedigido = winston.format((info) => Object.assign(info, redigir({ ...info })))();

const logger = winston.createLogger({
  level: config.logLevel,
  silent: config.isTest,
  defaultMeta: { service: 'ford-guardian-api', env: config.env },
  format: winston.format.combine(
    winston.format.timestamp(),
    formatoRedigido,
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return undefined;
  const [usuario, dominio] = email.split('@');
  return `${usuario.slice(0, 2)}***@${dominio}`;
}

module.exports = { logger, redigir, maskEmail };
