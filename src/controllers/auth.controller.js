const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const { store, publicUser } = require('../data/store');
const { encrypt } = require('../security/crypto');
const tokens = require('../security/tokens');
const { securityMonitor } = require('../utils/securityMonitor');
const { AppError } = require('../middleware/errorHandler.middleware');
const { registrarEvento } = require('../observability/security-events');
const { maskEmail } = require('../observability/logger');

// Hash usado quando o e-mail não existe: mantém o tempo de resposta constante (evita enumeração de usuários)
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', config.bcryptRounds);

function respostaTokens(usuario) {
  return {
    user: publicUser(usuario),
    accessToken: tokens.gerarAccessToken(usuario),
    refreshToken: tokens.emitirRefreshToken(usuario.id),
    tokenType: 'Bearer',
    expiresIn: config.jwt.accessTtl
  };
}

async function login(req, res) {
  const { email, password } = req.body;
  const contexto = { requestId: req.id, ip: req.ip, email: maskEmail(email) };

  if (securityMonitor.estaBloqueado(email)) {
    registrarEvento('auth.login.blocked', contexto);
    throw new AppError('Conta temporariamente bloqueada por excesso de tentativas', 423, 'ACCOUNT_LOCKED');
  }

  const usuario = store.users.find(u => u.email === email && u.active);
  const senhaValida = await bcrypt.compare(password, usuario ? usuario.password : HASH_FALSO);
  if (!usuario || !senhaValida) {
    const tentativa = securityMonitor.registrarFalha(email, req.ip, req.id);
    registrarEvento('auth.login.failed', { ...contexto, reason: 'INVALID_CREDENTIALS', attempt: tentativa });
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  securityMonitor.registrarSucesso(email);
  registrarEvento('auth.login.success', { ...contexto, userId: usuario.id, role: usuario.role }, 'info');
  res.status(200).json({ success: true, data: respostaTokens(usuario) });
}

async function register(req, res) {
  const { name, email, password, phone } = req.body;
  if (store.users.some(u => u.email === email)) throw new AppError('E-mail já cadastrado', 409, 'EMAIL_EXISTS');

  const usuario = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    name, email,
    password: await bcrypt.hash(password, config.bcryptRounds),
    phone: encrypt(phone || null),
    role: 'user', // o perfil nunca vem do cliente (proteção contra mass assignment / escalada de privilégio)
    active: true,
    createdAt: new Date().toISOString(),
    preferences: { notifications: true, language: 'pt-BR' }
  };
  store.users.push(usuario);
  store.consents.set(usuario.id, { telemetry: false, location: false, updatedAt: usuario.createdAt });
  registrarEvento('audit.user.registered', { requestId: req.id, userId: usuario.id }, 'info');
  res.status(201).json({ success: true, data: respostaTokens(usuario) });
}

async function refresh(req, res) {
  const resultado = tokens.rotacionarRefreshToken(req.body.refreshToken);
  if (resultado.erro) {
    registrarEvento('auth.refresh.rejected', { requestId: req.id, ip: req.ip, reason: resultado.erro, userId: resultado.usuarioId });
    throw new AppError('Refresh token inválido ou expirado', 401, resultado.erro);
  }
  const usuario = store.users.find(u => u.id === resultado.usuarioId && u.active);
  if (!usuario) throw new AppError('Refresh token inválido ou expirado', 401, 'INVALID_REFRESH_TOKEN');
  res.status(200).json({ success: true, data: respostaTokens(usuario) });
}

async function logout(req, res) {
  tokens.revogarSessoes(req.user.id);
  tokens.revogarAccessToken(req.token);
  registrarEvento('auth.logout', { requestId: req.id, userId: req.user.id }, 'info');
  res.status(204).end();
}

async function profile(req, res) {
  const usuario = store.users.find(u => u.id === req.user.id);
  res.status(200).json({ success: true, data: publicUser(usuario) });
}

module.exports = { login, register, refresh, logout, profile };
