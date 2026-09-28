const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const { requireRole, ROLES } = require('../middleware/rbac.middleware');
const { securityMonitor } = require('../utils/securityMonitor');
const { store } = require('../data/store');
const tokens = require('../security/tokens');
const { registrarEvento } = require('../observability/security-events');

// Antes da Sprint 3 estas rotas não exigiam autenticação. Agora: somente ADMIN.
const router = express.Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get('/status', (req, res) => {
  res.json({ success: true, data: { ...securityMonitor.status(), usuariosAtivos: store.users.filter(u => u.active).length,
    uptimeSegundos: Math.round(process.uptime()) } });
});

// Contenção de incidente: encerra todas as sessões de um usuário (ex.: token vazado)
router.post('/users/:id/revoke-sessions', (req, res) => {
  const usuario = store.users.find(u => u.id === req.params.id);
  if (!usuario) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado', requestId: req.id } });
  tokens.revogarSessoes(usuario.id);
  registrarEvento('incident.sessions.revoked', { requestId: req.id, adminId: req.user.id, targetUserId: usuario.id }, 'error');
  return res.status(204).end();
});

module.exports = router;
