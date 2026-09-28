require('dotenv').config({ quiet: true });
const crypto = require('crypto');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

// Em produção todo segredo é obrigatório; em dev/test são gerados aleatoriamente a cada execução
// (nenhum segredo fixo fica no código-fonte).
function segredo(nome, bytes = 48) {
  const valor = process.env[nome];
  if (valor) return valor;
  if (isProd) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return crypto.randomBytes(bytes).toString('base64');
}

function chaveAes() {
  const valor = segredo('ENCRYPTION_KEY', 32);
  const chave = Buffer.from(valor, 'base64');
  if (chave.length !== 32) throw new Error('ENCRYPTION_KEY deve ter 32 bytes em base64 (AES-256)');
  return chave;
}

const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: segredo('JWT_SECRET'),
    issuer: 'ford-guardian-api',
    audience: 'ford-guardian-app',
    accessTtl: process.env.JWT_EXPIRES_IN || '15m',
    refreshTtlMs: 7 * 24 * 60 * 60 * 1000
  },
  encryptionKey: chaveAes(),
  iotHmacSecret: segredo('IOT_HMAC_SECRET', 32),
  metricsToken: segredo('METRICS_TOKEN', 24),
  corsOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:8081').split(',').map(o => o.trim()).filter(Boolean),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10)
  },
  lockout: { maxTentativas: 5, janelaMs: 15 * 60 * 1000 },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  tls: { certPath: process.env.TLS_CERT_PATH, keyPath: process.env.TLS_KEY_PATH }
};

if (Buffer.byteLength(config.jwt.secret) < 32) {
  throw new Error('JWT_SECRET deve ter no mínimo 32 bytes');
}

module.exports = config;
