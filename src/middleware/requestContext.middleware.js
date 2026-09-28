const crypto = require('crypto');
const { logger } = require('../observability/logger');
const { httpRequests, httpDuration } = require('../observability/metrics');

const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

/** Correlation id por requisição + log de acesso estruturado + métricas HTTP (RED). */
function requestContext(req, res, next) {
  const recebido = req.get('X-Request-ID');
  req.id = recebido && ID_VALIDO.test(recebido) ? recebido : crypto.randomUUID();
  res.set('X-Request-ID', req.id);
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracao = Number(process.hrtime.bigint() - inicio) / 1e9;
    const rota = req.route ? `${req.baseUrl}${req.route.path}` : 'nao_mapeada';
    const labels = { method: req.method, route: rota, status: String(res.statusCode) };
    httpRequests.inc(labels);
    httpDuration.observe(labels, duracao);
    logger.info('http.request', {
      event: 'http.request', requestId: req.id, method: req.method, route: rota, status: res.statusCode,
      durationMs: Math.round(duracao * 1000), userId: req.user?.id, ip: req.ip
    });
  });
  next();
}

module.exports = requestContext;
