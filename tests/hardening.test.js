const { app, request, login } = require('./helpers');
const { createApp } = require('../src/app');

describe('Hardening da API', () => {
  test('headers de segurança (Helmet) e sem X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('payload acima de 10kb é rejeitado com 413', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('JSON malformado retorna 400 padronizado sem stack trace', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|node_modules/);
  });

  test('VIN com SQL injection e parâmetro de rota malicioso são rejeitados', async () => {
    const { accessToken } = await login('felipe');
    const auth = { Authorization: `Bearer ${accessToken}` };
    const vin = await request(app).post('/api/vehicles').set(auth).send({ vin: "1' OR '1'='1", brand: 'Ford', model: 'X', year: 2024, mileage: 0 });
    expect(vin.status).toBe(400);
    const param = await request(app).get('/api/vehicles/..%2F..%2Fetc%2Fpasswd').set(auth);
    expect(param.status).toBe(400);
  });

  test('XSS no nome é neutralizado no cadastro', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: '<script>alert(1)</script>Ana', email: 'ana.xss@example.com', password: 'Senha@1234' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.name).not.toContain('<script>');
  });

  test('rate limit de autenticação responde 429 após o limite', async () => {
    const limitado = createApp({ rateLimit: { authMax: 3 } });
    for (let i = 0; i < 3; i++) await request(limitado).post('/api/auth/login').send({ email: 'x@y.com', password: 'a' });
    const res = await request(limitado).post('/api/auth/login').send({ email: 'x@y.com', password: 'a' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
  });

  test('/metrics exige token próprio', async () => {
    expect((await request(app).get('/metrics')).status).toBe(401);
    const res = await request(app).get('/metrics').set('Authorization', 'Bearer token-de-metricas-dos-testes');
    expect(res.status).toBe(200);
    expect(res.text).toContain('security_events_total');
  });
});
