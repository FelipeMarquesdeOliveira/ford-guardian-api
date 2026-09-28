const jwt = require('jsonwebtoken');
const { app, request, login } = require('./helpers');

describe('Autenticação e JWT', () => {
  test('login válido retorna access token HS256 com iss, aud, jti e expiração de 15 min', async () => {
    const dados = await login('felipe');
    const decodificado = jwt.decode(dados.accessToken, { complete: true });
    expect(decodificado.header.alg).toBe('HS256');
    expect(decodificado.payload).toMatchObject({ iss: 'ford-guardian-api', aud: 'ford-guardian-app', role: 'user', typ: 'access' });
    expect(decodificado.payload.jti).toBeDefined();
    expect(decodificado.payload.exp - decodificado.payload.iat).toBe(15 * 60);
    expect(dados.user.password).toBeUndefined();
  });

  test('credenciais inválidas retornam 401 sem revelar se o e-mail existe', async () => {
    const existente = await request(app).post('/api/auth/login').send({ email: 'maria@example.com', password: 'Errada@123' });
    const inexistente = await request(app).post('/api/auth/login').send({ email: 'ninguem@example.com', password: 'Errada@123' });
    expect(existente.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(existente.body.error.message).toBe(inexistente.body.error.message);
  });

  test('conta é bloqueada após 5 falhas (força bruta) e responde 423', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'analyst@ford.com', password: 'Errada@123' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'analyst@ford.com', password: 'Analyst@123' });
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('cadastro recusa tentativa de escalar privilégio pelo campo role', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Invasor', email: 'invasor@example.com', password: 'Senha@1234', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map(d => d.field)).toContain('role');
  });

  test('cadastro exige senha forte', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Teste', email: 't@example.com', password: '123456' });
    expect(res.status).toBe(400);
  });

  test('refresh token é rotacionado e o reuso revoga todas as sessões', async () => {
    const dados = await login('maria');
    const renovado = await request(app).post('/api/auth/refresh').send({ refreshToken: dados.refreshToken });
    expect(renovado.status).toBe(200);
    const reuso = await request(app).post('/api/auth/refresh').send({ refreshToken: dados.refreshToken });
    expect(reuso.status).toBe(401);
    expect(reuso.body.error.code).toBe('REFRESH_TOKEN_REUSED');
    const novoTambemRevogado = await request(app).post('/api/auth/refresh').send({ refreshToken: renovado.body.data.refreshToken });
    expect(novoTambemRevogado.status).toBe(401);
  });

  test('logout revoga o access token imediatamente', async () => {
    const dados = await login('felipe');
    const auth = { Authorization: `Bearer ${dados.accessToken}` };
    expect((await request(app).post('/api/auth/logout').set(auth)).status).toBe(204);
    expect((await request(app).get('/api/auth/profile').set(auth)).status).toBe(401);
  });
});

describe('Proteção dos recursos com token', () => {
  const segredoErrado = 'segredo-de-um-atacante-com-mais-de-32-bytes!!';

  test('sem token -> 401', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  test('token assinado com outro segredo -> 401', async () => {
    const falso = jwt.sign({ sub: 'usr_001', role: 'admin', typ: 'access' }, segredoErrado,
      { issuer: 'ford-guardian-api', audience: 'ford-guardian-app' });
    expect((await request(app).get('/api/vehicles').set('Authorization', `Bearer ${falso}`)).status).toBe(401);
  });

  test('token sem assinatura (alg none) -> 401', async () => {
    const semAssinatura = jwt.sign({ sub: 'usr_001', role: 'admin', typ: 'access' }, null,
      { algorithm: 'none', issuer: 'ford-guardian-api', audience: 'ford-guardian-app' });
    expect((await request(app).get('/api/vehicles').set('Authorization', `Bearer ${semAssinatura}`)).status).toBe(401);
  });

  test('token expirado -> 401 TOKEN_EXPIRED', async () => {
    const config = require('../src/config');
    const expirado = jwt.sign({ sub: 'usr_001', role: 'admin', typ: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      config.jwt.secret, { issuer: 'ford-guardian-api', audience: 'ford-guardian-app' });
    const res = await request(app).get('/api/vehicles').set('Authorization', `Bearer ${expirado}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
