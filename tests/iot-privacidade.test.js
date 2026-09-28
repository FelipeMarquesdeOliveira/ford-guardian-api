const { app, request, login } = require('./helpers');
const { assinar } = require('../src/security/hmac');

function enviar(corpo, { timestamp = Date.now(), assinatura, deviceId = corpo.deviceId } = {}) {
  const bruto = JSON.stringify(corpo);
  return request(app).post('/api/telemetry').set('Content-Type', 'application/json')
    .set('X-Device-Id', deviceId).set('X-Timestamp', String(timestamp))
    .set('X-Signature', assinatura || assinar(timestamp, bruto)).send(bruto);
}
const leitura = (extra = {}) => ({ deviceId: 'obd-veh_004', odometerKm: 28150, engineTempC: 126.5, batteryVoltage: 12.1, dtcCodes: ['P0301'], ...extra });

describe('Telemetria IoT assinada (HMAC + anti-replay)', () => {
  test('mensagem assinada é aceita e gera alerta de anomalia', async () => {
    const res = await enviar(leitura());
    expect(res.status).toBe(202);
    expect(res.body.data.alertsCreated).toHaveLength(1);
  });

  test('assinatura inválida é rejeitada', async () => {
    const res = await enviar(leitura(), { assinatura: 'ab'.repeat(32) });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  test('mensagem reenviada (replay) é rejeitada', async () => {
    const timestamp = Date.now();
    const corpo = leitura({ odometerKm: 28200 });
    expect((await enviar(corpo, { timestamp })).status).toBe(202);
    const replay = await enviar(corpo, { timestamp });
    expect(replay.body.error.code).toBe('REPLAYED_MESSAGE');
  });

  test('timestamp fora da janela de 5 minutos é rejeitado', async () => {
    const res = await enviar(leitura(), { timestamp: Date.now() - 10 * 60 * 1000 });
    expect(res.body.error.code).toBe('STALE_TIMESTAMP');
  });

  test('dispositivo desconhecido é rejeitado', async () => {
    const res = await enviar(leitura({ deviceId: 'obd-veh_999' }));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNKNOWN_DEVICE');
  });
});

describe('Privacidade (LGPD)', () => {
  test('titular exporta os próprios dados (acesso/portabilidade)', async () => {
    const { accessToken } = await login('maria');
    const res = await request(app).get('/api/privacy/me/export').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.titular.email).toBe('maria@example.com');
    expect(res.body.data.veiculos.every(v => v.userId === 'usr_004')).toBe(true);
  });

  test('sem consentimento de telemetria a coleta é recusada', async () => {
    const { accessToken } = await login('felipe');
    await request(app).patch('/api/privacy/me/consents').set('Authorization', `Bearer ${accessToken}`).send({ telemetry: false });
    const res = await enviar({ deviceId: 'obd-veh_001', odometerKm: 15100, engineTempC: 90, batteryVoltage: 12.6 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CONSENT_REQUIRED');
  });

  test('eliminação anonimiza o titular e invalida o acesso', async () => {
    const { accessToken } = await login('maria');
    const auth = { Authorization: `Bearer ${accessToken}` };
    expect((await request(app).delete('/api/privacy/me').set(auth)).status).toBe(204);
    expect((await request(app).get('/api/auth/profile').set(auth)).status).toBe(401);
    const novoLogin = await request(app).post('/api/auth/login').send({ email: 'maria@example.com', password: 'Maria@123' });
    expect(novoLogin.status).toBe(401);
  });
});
