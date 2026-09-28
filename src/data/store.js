const bcrypt = require('bcryptjs');
const config = require('../config');
const { encrypt, decrypt } = require('../security/crypto');
const { mockUsers } = require('../../mockData/users.mock');
const { mockVehicles } = require('../../mockData/vehicles.mock');
const { mockAlerts } = require('../../mockData/alerts.mock');
const { mockDealers } = require('../../mockData/dealers.mock');

/**
 * Repositório em memória (dados mockados). As senhas recebem hash bcrypt UMA vez na carga
 * (antes eram re-hasheadas a cada login: custo alto e vetor de DoS) e os dados pessoais
 * sensíveis (telefone, placa) ficam cifrados com AES-256-GCM.
 */
const store = { users: [], vehicles: [], alerts: [], dealers: [], consents: new Map(), devices: new Map() };

function reset() {
  store.users = mockUsers.map(u => ({
    ...u,
    password: bcrypt.hashSync(u.password, config.bcryptRounds),
    phone: encrypt(u.phone),
    active: true
  }));
  store.vehicles = mockVehicles.map(v => ({ ...v, licensePlate: encrypt(v.licensePlate) }));
  store.alerts = mockAlerts.map(a => ({ ...a }));
  store.dealers = mockDealers.map(d => ({ ...d }));
  store.consents = new Map(store.users.map(u => [u.id, { telemetry: true, location: false, updatedAt: u.createdAt }]));
  // Dispositivos OBD/IoT cadastrados: deviceId -> veículo
  store.devices = new Map(store.vehicles.map(v => [`obd-${v.id}`, v.id]));
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, phone: decrypt(u.phone),
    createdAt: u.createdAt, preferences: u.preferences };
}

function publicVehicle(v) {
  return { ...v, licensePlate: decrypt(v.licensePlate) };
}

reset();

module.exports = { store, reset, publicUser, publicVehicle };
