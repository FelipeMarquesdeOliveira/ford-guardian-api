const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { sha256 } = require('./crypto');

// Refresh tokens opacos: guardamos apenas o hash. jti revogados ficam em denylist até expirarem.
const refreshTokens = new Map();
const accessRevogados = new Map();

function gerarAccessToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, role: usuario.role, typ: 'access' },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: config.jwt.accessTtl, issuer: config.jwt.issuer,
      audience: config.jwt.audience, jwtid: crypto.randomUUID() }
  );
}

function validarAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'], issuer: config.jwt.issuer, audience: config.jwt.audience
  });
  if (payload.typ !== 'access') throw new jwt.JsonWebTokenError('tipo de token inválido');
  if (accessRevogados.has(payload.jti)) throw new jwt.JsonWebTokenError('token revogado');
  return payload;
}

function emitirRefreshToken(usuarioId) {
  const valor = crypto.randomBytes(32).toString('base64url');
  refreshTokens.set(sha256(valor), { usuarioId, expiraEm: Date.now() + config.jwt.refreshTtlMs, revogado: false });
  return valor;
}

/** Rotação: o token usado é revogado. Reuso de token revogado encerra todas as sessões do usuário. */
function rotacionarRefreshToken(valor) {
  const registro = refreshTokens.get(sha256(valor || ''));
  if (!registro) return { erro: 'INVALID_REFRESH_TOKEN' };
  if (registro.revogado) {
    revogarSessoes(registro.usuarioId);
    return { erro: 'REFRESH_TOKEN_REUSED', usuarioId: registro.usuarioId };
  }
  if (registro.expiraEm < Date.now()) return { erro: 'REFRESH_TOKEN_EXPIRED' };
  registro.revogado = true;
  return { usuarioId: registro.usuarioId };
}

function revogarSessoes(usuarioId) {
  for (const registro of refreshTokens.values()) {
    if (registro.usuarioId === usuarioId) registro.revogado = true;
  }
}

function revogarAccessToken(payload) {
  accessRevogados.set(payload.jti, payload.exp * 1000);
  const agora = Date.now();
  for (const [jti, expira] of accessRevogados) if (expira < agora) accessRevogados.delete(jti);
}

module.exports = { gerarAccessToken, validarAccessToken, emitirRefreshToken, rotacionarRefreshToken,
  revogarSessoes, revogarAccessToken };
