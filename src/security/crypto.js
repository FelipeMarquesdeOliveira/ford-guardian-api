const crypto = require('crypto');
const config = require('../config');

const ALGORITMO = 'aes-256-gcm';
const PREFIXO = 'v1';
const TAG_BYTES = 16;

/** Criptografia autenticada (AES-256-GCM): confidencialidade + integridade do dado em repouso. */
function encrypt(texto) {
  if (texto === null || texto === undefined) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, config.encryptionKey, iv, { authTagLength: TAG_BYTES });
  const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIXO, iv.toString('base64'), tag.toString('base64'), cifrado.toString('base64')].join(':');
}

function decrypt(valor) {
  if (!valor) return null;
  const [versao, iv, tag, cifrado] = valor.split(':');
  if (versao !== PREFIXO) throw new Error('Formato de dado criptografado desconhecido');
  const tagBuffer = Buffer.from(tag, 'base64');
  // Tamanho da tag fixado: impede aceitar tags truncadas (forjamento de mensagens no GCM)
  if (tagBuffer.length !== TAG_BYTES) throw new Error('Tag de autenticação inválida');
  const decipher = crypto.createDecipheriv(ALGORITMO, config.encryptionKey, Buffer.from(iv, 'base64'), { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tagBuffer);
  return Buffer.concat([decipher.update(Buffer.from(cifrado, 'base64')), decipher.final()]).toString('utf8');
}

function sha256(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

/** Pseudonimização estável (HMAC) para uso em analytics/ML sem expor o identificador real. */
function pseudonimizar(valor) {
  return crypto.createHmac('sha256', config.encryptionKey).update(String(valor)).digest('hex').slice(0, 16);
}

module.exports = { encrypt, decrypt, sha256, pseudonimizar };
