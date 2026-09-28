const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');
const requestContext = require('./middleware/requestContext.middleware');
const { criarLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');
const { registry } = require('./observability/metrics');

function createApp(opcoes = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' }
  }));
  app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'], maxAge: 600 }));
  app.use(requestContext);
  app.use(express.json({ limit: '10kb', verify: (req, res, buf) => { req.rawBody = buf; } }));

  const limites = { ...config.rateLimit, ...opcoes.rateLimit };
  const geral = criarLimiter({ windowMs: limites.windowMs, max: limites.max, nome: 'global', code: 'RATE_LIMIT_EXCEEDED', message: 'Muitas requisições, tente novamente mais tarde.' });
  const auth = criarLimiter({ windowMs: 15 * 60 * 1000, max: limites.authMax, nome: 'auth', code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Muitas tentativas de autenticação, tente novamente em 15 minutos.' });
  const busca = criarLimiter({ windowMs: 60 * 1000, max: 30, nome: 'search', code: 'SEARCH_RATE_LIMIT_EXCEEDED', message: 'Muitas buscas, aguarde um instante.' });

  app.get('/health', (req, res) => res.json({ status: 'healthy', version: '3.0.0', timestamp: new Date().toISOString() }));

  // Métricas para o Prometheus: exigem token próprio (não expõe o endpoint publicamente)
  app.get('/metrics', async (req, res) => {
    const esperado = Buffer.from(`Bearer ${config.metricsToken}`);
    const recebido = Buffer.from(req.get('Authorization') || '');
    if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token de métricas inválido', requestId: req.id } });
    }
    res.set('Content-Type', registry.contentType);
    return res.send(await registry.metrics());
  });

  app.use('/api', geral);
  app.use('/api/auth', require('./routes/auth.routes')(auth));
  app.use('/api/vehicles', require('./routes/vehicle.routes'));
  app.use('/api/alerts', require('./routes/alert.routes'));
  app.use('/api/dealers', require('./routes/dealer.routes')(busca));
  app.use('/api/telemetry', require('./routes/telemetry.routes'));
  app.use('/api/privacy', require('./routes/privacy.routes'));
  app.use('/api/monitoring', require('./routes/monitoring.routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
