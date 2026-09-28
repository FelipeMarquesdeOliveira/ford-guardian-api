const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'ford_guardian_' });

const httpRequests = new client.Counter({
  name: 'http_requests_total', help: 'Requisições HTTP por rota e status',
  labelNames: ['method', 'route', 'status'], registers: [registry]
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds', help: 'Latência das requisições HTTP',
  labelNames: ['method', 'route', 'status'], buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5], registers: [registry]
});
const securityEvents = new client.Counter({
  name: 'security_events_total', help: 'Eventos de segurança (login falho, acesso negado, bloqueio...)',
  labelNames: ['event'], registers: [registry]
});
const iotTelemetry = new client.Counter({
  name: 'iot_telemetry_total', help: 'Mensagens de telemetria IoT aceitas/rejeitadas',
  labelNames: ['result'], registers: [registry]
});

module.exports = { registry, httpRequests, httpDuration, securityEvents, iotTelemetry };
