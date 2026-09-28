const { AppError } = require('./errorHandler.middleware');
const { registrarEvento } = require('../observability/security-events');

/**
 * Perfis: admin (Administrador Ford), analyst (Gestor / analista de pós-venda), user (cliente).
 */
const ROLES = { ADMIN: 'admin', ANALYST: 'analyst', USER: 'user' };

const requireRole = (...permitidos) => (req, res, next) => {
  if (!req.user) return next(new AppError('Autenticação necessária', 401, 'AUTH_REQUIRED'));
  if (!permitidos.includes(req.user.role)) {
    registrarEvento('authz.denied', { requestId: req.id, userId: req.user.id, role: req.user.role,
      requiredRoles: permitidos, path: req.originalUrl });
    return next(new AppError('Acesso negado para o seu perfil', 403, 'INSUFFICIENT_PERMISSIONS'));
  }
  return next();
};

/** Proteção contra BOLA (OWASP API1): cliente só acessa recursos que pertencem a ele. */
function garantirPropriedade(req, donoId) {
  if (req.user.role === ROLES.USER && donoId !== req.user.id) {
    registrarEvento('authz.bola.blocked', { requestId: req.id, userId: req.user.id, path: req.originalUrl });
    throw new AppError('Acesso negado a este recurso', 403, 'ACCESS_DENIED');
  }
}

module.exports = { ROLES, requireRole, garantirPropriedade };
