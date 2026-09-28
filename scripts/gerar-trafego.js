/**
 * Gera tráfego de demonstração (uso normal + ataques simulados) para alimentar logs, métricas,
 * alertas do Prometheus e o dashboard do Grafana. Uso: API_URL=http://localhost:3000 node scripts/gerar-trafego.js
 */
const API = process.env.API_URL || 'http://localhost:3000';
const post = (p, corpo, headers = {}) => fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(corpo) });
const get = (p, headers = {}) => fetch(API + p, { headers });

(async () => {
  const contagem = {};
  const marcar = (nome, status) => { contagem[`${nome} -> ${status}`] = (contagem[`${nome} -> ${status}`] || 0) + 1; };

  const login = await post('/api/auth/login', { email: 'felipe@example.com', password: 'Felipe@123' }).then(r => r.json());
  const token = login.data.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  for (let i = 0; i < 40; i++) {
    marcar('uso normal GET /api/vehicles', (await get('/api/vehicles', auth)).status);
    marcar('uso normal GET /api/alerts', (await get('/api/alerts', auth)).status);
  }
  // Força bruta / credential stuffing contra várias contas
  for (const email of ['maria@example.com', 'analyst@ford.com', 'carlos@ford.com']) {
    for (let i = 0; i < 6; i++) marcar('força bruta no login', (await post('/api/auth/login', { email, password: `Tentativa@${i}` })).status);
  }
  // BOLA: cliente tentando ler veículo e alerta de outra pessoa
  for (let i = 0; i < 12; i++) {
    marcar('BOLA GET /api/vehicles/veh_003', (await get('/api/vehicles/veh_003', auth)).status);
    marcar('BOLA PATCH /api/alerts/alt_002/read', (await fetch(`${API}/api/alerts/alt_002/read`, { method: 'PATCH', headers: auth })).status);
  }
  // Escalada de privilégio: cliente chamando rota de administrador
  for (let i = 0; i < 10; i++) marcar('RBAC GET /api/monitoring/status', (await get('/api/monitoring/status', auth)).status);
  // Tokens forjados
  for (let i = 0; i < 10; i++) marcar('token forjado', (await get('/api/vehicles', { Authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c3JfMDAxIiwicm9sZSI6ImFkbWluIn0.' })).status);
  // Telemetria forjada (sem a chave HMAC do dispositivo)
  for (let i = 0; i < 8; i++) {
    marcar('telemetria forjada', (await post('/api/telemetry', { deviceId: 'obd-veh_004', odometerKm: 1, engineTempC: 90, batteryVoltage: 12 },
      { 'X-Device-Id': 'obd-veh_004', 'X-Timestamp': String(Date.now()), 'X-Signature': 'f'.repeat(64) })).status);
  }
  console.table(contagem);
})();
