const request = require('supertest');
const app = require('../src/index');

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
  });
});

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'felipe@example.com',
          password: '123456'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'felipe@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Test@123',
          phone: '+5511999999999'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'felipe@example.com',
          password: 'Test@123'
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });
});

describe('Vehicle Routes', () => {
  let token;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'felipe@example.com',
        password: '123456'
      });

    token = loginRes.body.data.accessToken;
  });

  describe('GET /api/vehicles', () => {
    it('should return vehicles list', async () => {
      const res = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicles).toBeDefined();
      expect(Array.isArray(res.body.data.vehicles)).toBe(true);
    });
  });

  describe('POST /api/vehicles', () => {
    it('should create new vehicle', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vin: '1HGCM82633A004765',
          brand: 'Ford',
          model: 'Test Car',
          year: 2024,
          mileage: 0
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should validate VIN length', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vin: 'short',
          brand: 'Ford',
          model: 'Test Car',
          year: 2024,
          mileage: 0
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});

describe('Rate Limiting', () => {
  it('should enforce rate limits on auth', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrong'
      })
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
  });
});