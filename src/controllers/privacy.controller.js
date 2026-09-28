const { store, publicUser, publicVehicle } = require('../data/store');
const tokens = require('../security/tokens');
const { registrarEvento } = require('../observability/security-events');

/** LGPD art. 18, II e V: acesso e portabilidade dos dados do titular. */
async function exportar(req, res) {
  const usuario = store.users.find(u => u.id === req.user.id);
  const veiculos = store.vehicles.filter(v => v.userId === usuario.id);
  const ids = new Set(veiculos.map(v => v.id));
  registrarEvento('privacy.data.exported', { requestId: req.id, userId: usuario.id }, 'info');
  res.set('Content-Disposition', 'attachment; filename="meus-dados-ford-guardian.json"').json({
    success: true,
    data: { geradoEm: new Date().toISOString(), titular: publicUser(usuario), veiculos: veiculos.map(publicVehicle),
      alertas: store.alerts.filter(a => ids.has(a.vehicleId)), consentimentos: store.consents.get(usuario.id) }
  });
}

/** LGPD art. 18, VI: eliminação. Dados pessoais são anonimizados e os tokens revogados. */
async function eliminar(req, res) {
  const usuario = store.users.find(u => u.id === req.user.id);
  const veiculos = new Set(store.vehicles.filter(v => v.userId === usuario.id).map(v => v.id));
  store.vehicles = store.vehicles.filter(v => !veiculos.has(v.id));
  store.alerts = store.alerts.filter(a => !veiculos.has(a.vehicleId));
  Object.assign(usuario, { name: 'Titular anonimizado', email: `anonimizado+${usuario.id}@invalid`, phone: null,
    password: '!', active: false });
  store.consents.delete(usuario.id);
  tokens.revogarSessoes(usuario.id);
  tokens.revogarAccessToken(req.token);
  registrarEvento('privacy.data.deleted', { requestId: req.id, userId: usuario.id });
  res.status(204).end();
}

/** Consentimento granular para telemetria e localização (LGPD art. 8º). */
async function atualizarConsentimentos(req, res) {
  const atual = store.consents.get(req.user.id) || { telemetry: false, location: false };
  const novo = { ...atual, ...req.body, updatedAt: new Date().toISOString() };
  store.consents.set(req.user.id, { telemetry: Boolean(novo.telemetry), location: Boolean(novo.location), updatedAt: novo.updatedAt });
  registrarEvento('privacy.consent.updated', { requestId: req.id, userId: req.user.id, consents: store.consents.get(req.user.id) }, 'info');
  res.json({ success: true, data: store.consents.get(req.user.id) });
}

module.exports = { exportar, eliminar, atualizarConsentimentos };
