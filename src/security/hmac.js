const crypto = require('crypto');
const config = require('../config');

const JANELA_MS = 5 * 60 * 1000;
const assinaturasVistas = new Map();

function assinar(timestamp, corpo, segredo = config.iotHmacSecret) {
  return crypto.createHmac('sha256', segredo).update(`${timestamp}.${corpo}`).digest('hex');
}

/**
 * Valida a assinatura HMAC-SHA256 de uma mensagem de telemetria:
 * assinatura = HMAC(segredo, "<timestamp>.<corpo bruto>"). Rejeita mensagens fora da janela
 * de 5 minutos e assinaturas já vistas (proteção contra replay).
 */
function verificar({ timestamp, assinatura, corpo }) {
  const ts = Number(timestamp);
  if (!ts || !assinatura || !corpo) return 'MISSING_SIGNATURE';
  if (Math.abs(Date.now() - ts) > JANELA_MS) return 'STALE_TIMESTAMP';
  const esperada = Buffer.from(assinar(ts, corpo), 'hex');
  const recebida = Buffer.from(String(assinatura), 'hex');
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return 'INVALID_SIGNATURE';
  if (assinaturasVistas.has(assinatura)) return 'REPLAYED_MESSAGE';
  assinaturasVistas.set(assinatura, ts);
  for (const [chave, instante] of assinaturasVistas) if (Date.now() - instante > JANELA_MS) assinaturasVistas.delete(chave);
  return null;
}

module.exports = { assinar, verificar };
