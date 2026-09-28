const crypto = require('crypto');
const { store } = require('../data/store');
const { verificar } = require('../security/hmac');
const { AppError } = require('../middleware/errorHandler.middleware');
const { registrarEvento } = require('../observability/security-events');
const { iotTelemetry } = require('../observability/metrics');

/**
 * Autentica o dispositivo IoT pela assinatura HMAC-SHA256 (headers X-Device-Id, X-Timestamp e X-Signature).
 * Mesmo formato usado pelo bridge MQTT/TLS (ver iot/): o corpo assinado é o JSON bruto recebido.
 */
function autenticarDispositivo(req, res, next) {
  const motivo = verificar({ timestamp: req.get('X-Timestamp'), assinatura: req.get('X-Signature'), corpo: req.rawBody?.toString('utf8') });
  const deviceId = req.get('X-Device-Id');
  if (!motivo && (!deviceId || deviceId !== req.body?.deviceId || !store.devices.has(deviceId))) {
    return rejeitar(req, next, 'UNKNOWN_DEVICE');
  }
  if (motivo) return rejeitar(req, next, motivo);
  return next();
}

function rejeitar(req, next, motivo) {
  iotTelemetry.inc({ result: 'rejected' });
  registrarEvento('iot.telemetry.rejected', { requestId: req.id, ip: req.ip, deviceId: req.get('X-Device-Id'), reason: motivo });
  return next(new AppError('Mensagem de telemetria não autenticada', 401, motivo));
}

async function ingest(req, res) {
  if (!store.consents.get(store.vehicles.find(v => v.id === store.devices.get(req.body.deviceId))?.userId)?.telemetry) {
    iotTelemetry.inc({ result: 'no_consent' });
    throw new AppError('Titular não consentiu com a coleta de telemetria', 403, 'CONSENT_REQUIRED');
  }
  const vehicleId = store.devices.get(req.body.deviceId);
  const { engineTempC, batteryVoltage, dtcCodes = [] } = req.body;
  const gerados = [];
  if (engineTempC > 110 || dtcCodes.length > 0 || batteryVoltage < 11.8) {
    const alerta = {
      id: `alt_${crypto.randomBytes(5).toString('hex')}`, vehicleId, type: 'telemetry_anomaly',
      severity: engineTempC > 120 || dtcCodes.length > 0 ? 'critical' : 'high',
      title: 'Anomalia detectada pela telemetria', description: 'Leitura fora do padrão recebida do dispositivo OBD.',
      recommendedAction: 'Agendar diagnóstico na concessionária.', isRead: false, isDismissed: false,
      createdAt: new Date().toISOString()
    };
    store.alerts.push(alerta);
    gerados.push(alerta.id);
  }
  iotTelemetry.inc({ result: 'accepted' });
  res.status(202).json({ success: true, data: { accepted: true, vehicleId, alertsCreated: gerados } });
}

module.exports = { autenticarDispositivo, ingest };
