const { app, request, login } = require('./helpers');

describe('Controle de acesso por perfil (RBAC) e por objeto (BOLA)', () => {
  let admin, analista, felipe, maria;
  beforeAll(async () => {
    [admin, analista, felipe, maria] = await Promise.all(['admin', 'analyst', 'felipe', 'maria'].map(login));
  });
  const bearer = (d) => ({ Authorization: `Bearer ${d.accessToken}` });

  test('monitoramento de segurança é exclusivo do ADMIN', async () => {
    expect((await request(app).get('/api/monitoring/status').set(bearer(admin))).status).toBe(200);
    expect((await request(app).get('/api/monitoring/status').set(bearer(analista))).status).toBe(403);
    expect((await request(app).get('/api/monitoring/status').set(bearer(felipe))).status).toBe(403);
    expect((await request(app).get('/api/monitoring/status')).status).toBe(401);
  });

  test('estatísticas da frota: ADMIN e gestor (analyst) sim, cliente não', async () => {
    expect((await request(app).get('/api/vehicles/health-stats').set(bearer(analista))).status).toBe(200);
    expect((await request(app).get('/api/vehicles/health-stats').set(bearer(felipe))).status).toBe(403);
  });

  test('cliente só lista os próprios veículos', async () => {
    const res = await request(app).get('/api/vehicles').set(bearer(felipe));
    expect(res.body.data.vehicles.every(v => v.userId === 'usr_003')).toBe(true);
  });

  test('cliente não acessa veículo de outro cliente (BOLA)', async () => {
    expect((await request(app).get('/api/vehicles/veh_003').set(bearer(felipe))).status).toBe(403);
    expect((await request(app).get('/api/vehicles/veh_003').set(bearer(maria))).status).toBe(200);
  });

  test('cliente não marca como lido o alerta de outro cliente (BOLA)', async () => {
    expect((await request(app).patch('/api/alerts/alt_002/read').set(bearer(felipe))).status).toBe(403);
    expect((await request(app).patch('/api/alerts/alt_002/read').set(bearer(maria))).status).toBe(200);
  });

  test('cliente não altera o healthStatus (propriedade restrita, BOPLA)', async () => {
    const res = await request(app).patch('/api/vehicles/veh_001').set(bearer(felipe)).send({ healthStatus: 'normal' });
    expect(res.status).toBe(403);
  });

  test('exclusão de veículo próprio gera 204 e o recurso deixa de existir', async () => {
    expect((await request(app).delete('/api/vehicles/veh_005').set(bearer(felipe))).status).toBe(204);
    expect((await request(app).get('/api/vehicles/veh_005').set(bearer(felipe))).status).toBe(404);
  });
});
