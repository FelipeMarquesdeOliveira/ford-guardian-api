const { validarAccessToken } = require('../security/tokens');
const { store } = require('../data/store');
const { AppError } = require('./errorHandler.middleware');
const { registrarEvento } = require('../observability/security-events');

/** Exige "Authorization: Bearer <jwt>" válido (HS256, iss, aud, exp, tipo e não revogado). */
function authenticate(req, res, next) {
  const header = req.get('Authorization') || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) return next(new AppError('Token de acesso ausente', 401, 'NO_TOKEN'));

  try {
    const payload = validarAccessToken(token);
    const usuario = store.users.find(u => u.id === payload.sub && u.active);
    if (!usuario) throw new AppError('Usuário inativo', 401, 'INVALID_TOKEN');
    req.user = { id: usuario.id, role: usuario.role, email: usuario.email };
    req.token = payload;
    return next();
  } catch (error) {
    const codigo = error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    registrarEvento('auth.token.rejected', { requestId: req.id, ip: req.ip, path: req.path, reason: codigo });
    return next(new AppError(codigo === 'TOKEN_EXPIRED' ? 'Token expirado' : 'Token inválido', 401, codigo));
  }
}

module.exports = authenticate;
