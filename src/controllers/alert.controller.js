const { store } = require('../data/store');
const { AppError } = require('../middleware/errorHandler.middleware');
const { ROLES, garantirPropriedade } = require('../middleware/rbac.middleware');

function donoDoAlerta(alerta) {
  return store.vehicles.find(v => v.id === alerta.vehicleId)?.userId;
}

function buscar(req) {
  const alerta = store.alerts.find(a => a.id === req.params.id);
  if (!alerta) throw new AppError('Alerta não encontrado', 404, 'ALERT_NOT_FOUND');
  garantirPropriedade(req, donoDoAlerta(alerta)); // antes, qualquer usuário marcava alertas de terceiros
  return alerta;
}

function alertasVisiveis(req) {
  if (req.user.role !== ROLES.USER) return [...store.alerts];
  const meus = new Set(store.vehicles.filter(v => v.userId === req.user.id).map(v => v.id));
  return store.alerts.filter(a => meus.has(a.vehicleId));
}

async function list(req, res) {
  const alertas = alertasVisiveis(req).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: { alerts: alertas, total: alertas.length,
    unreadCount: alertas.filter(a => !a.isRead && !a.isDismissed).length } });
}

async function get(req, res) {
  res.json({ success: true, data: buscar(req) });
}

async function markAsRead(req, res) {
  const alerta = buscar(req);
  alerta.isRead = true;
  res.json({ success: true, data: alerta });
}

async function dismiss(req, res) {
  const alerta = buscar(req);
  alerta.isDismissed = true;
  res.json({ success: true, data: alerta });
}

module.exports = { list, get, markAsRead, dismiss };
