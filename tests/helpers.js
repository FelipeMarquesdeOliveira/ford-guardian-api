const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
const CONTAS = {
  admin: ['admin@ford.com', 'Admin@123'],
  analyst: ['analyst@ford.com', 'Analyst@123'],
  felipe: ['felipe@example.com', 'Felipe@123'],
  maria: ['maria@example.com', 'Maria@123']
};

async function login(conta) {
  const [email, password] = CONTAS[conta];
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data;
}

module.exports = { app, request, login, CONTAS };
