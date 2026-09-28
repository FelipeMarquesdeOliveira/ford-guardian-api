const crypto = require('crypto');
const { store, publicVehicle } = require('../data/store');
const { encrypt } = require('../security/crypto');
const { AppError } = require('../middleware/errorHandler.middleware');
const { ROLES, garantirPropriedade } = require('../middleware/rbac.middleware');
const { registrarEvento } = require('../observability/security-events');

function buscar(req) {
  const veiculo = store.vehicles.find(v => v.id === req.params.id);
  if (!veiculo) throw new AppError('Veículo não encontrado', 404, 'VEHICLE_NOT_FOUND');
  garantirPropriedade(req, veiculo.userId);
  return veiculo;
}

async function list(req, res) {
  const { limit = 50, offset = 0, healthStatus } = req.query;
  let veiculos = req.user.role === ROLES.USER ? store.vehicles.filter(v => v.userId === req.user.id) : [...store.vehicles];
  if (healthStatus) veiculos = veiculos.filter(v => v.healthStatus === healthStatus);
  const pagina = veiculos.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ success: true, data: { vehicles: pagina.map(publicVehicle), total: veiculos.length } });
}

async function get(req, res) {
  res.json({ success: true, data: publicVehicle(buscar(req)) });
}

async function create(req, res) {
  const { vin, brand, model, year, licensePlate, mileage } = req.body;
  if (store.vehicles.some(v => v.vin === vin)) throw new AppError('VIN já cadastrado', 409, 'VIN_EXISTS');
  const veiculo = {
    id: `veh_${crypto.randomBytes(5).toString('hex')}`, userId: req.user.id, vin, brand, model,
    year: Number(year), licensePlate: encrypt(licensePlate || null), mileage: Number(mileage),
    healthStatus: 'normal', lastService: null, nextServiceDue: null, createdAt: new Date().toISOString()
  };
  store.vehicles.push(veiculo);
  store.devices.set(`obd-${veiculo.id}`, veiculo.id);
  registrarEvento('audit.vehicle.created', { requestId: req.id, userId: req.user.id, vehicleId: veiculo.id }, 'info');
  res.status(201).location(`/api/vehicles/${veiculo.id}`).json({ success: true, data: publicVehicle(veiculo) });
}

async function update(req, res) {
  const veiculo = buscar(req);
  const { mileage, licensePlate, healthStatus } = req.body;
  // healthStatus é calculado pela telemetria/analistas: cliente não pode alterar (proteção BOPLA)
  if (healthStatus !== undefined && req.user.role === ROLES.USER) {
    throw new AppError('Campo healthStatus não pode ser alterado pelo cliente', 403, 'FIELD_NOT_ALLOWED');
  }
  if (mileage !== undefined) veiculo.mileage = Number(mileage);
  if (licensePlate !== undefined) veiculo.licensePlate = encrypt(licensePlate);
  if (healthStatus !== undefined) veiculo.healthStatus = healthStatus;
  registrarEvento('audit.vehicle.updated', { requestId: req.id, userId: req.user.id, vehicleId: veiculo.id,
    fields: Object.keys(req.body) }, 'info');
  res.json({ success: true, data: publicVehicle(veiculo) });
}

async function remove(req, res) {
  const veiculo = buscar(req);
  store.vehicles = store.vehicles.filter(v => v.id !== veiculo.id);
  store.alerts = store.alerts.filter(a => a.vehicleId !== veiculo.id);
  store.devices.delete(`obd-${veiculo.id}`);
  registrarEvento('audit.vehicle.deleted', { requestId: req.id, userId: req.user.id, vehicleId: veiculo.id });
  res.status(204).end();
}

async function healthStats(req, res) {
  const distribution = { normal: 0, attention: 0, critical: 0 };
  store.vehicles.forEach(v => { distribution[v.healthStatus] = (distribution[v.healthStatus] || 0) + 1; });
  res.json({ success: true, data: { distribution, total: store.vehicles.length } });
}

module.exports = { list, get, create, update, remove, healthStats };
