/**
 * Simulador (mock) de um dispositivo OBD/IoT do veículo enviando telemetria assinada para a API.
 * Em produção o transporte é MQTT sobre TLS (infra/mosquitto); o formato de assinatura é o mesmo:
 *   X-Signature = HMAC-SHA256(IOT_HMAC_SECRET, "<timestamp>.<corpo JSON>")
 * Uso: API_URL=http://localhost:3000 IOT_HMAC_SECRET=... node iot/simulador-dispositivo.js
 */
const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SEGREDO = process.env.IOT_HMAC_SECRET;
if (!SEGREDO) { console.error('Defina IOT_HMAC_SECRET'); process.exit(1); }

async function enviar(leitura, { adulterar = false, timestamp = Date.now(), assinaturaFixa } = {}) {
  const corpo = JSON.stringify(leitura);
  const assinatura = assinaturaFixa || crypto.createHmac('sha256', SEGREDO).update(`${timestamp}.${corpo}`).digest('hex');
  const enviado = adulterar ? corpo.replace('"engineTempC":9', '"engineTempC":1') : corpo;
  const res = await fetch(`${API_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': leitura.deviceId, 'X-Timestamp': String(timestamp), 'X-Signature': assinatura },
    body: enviado
  });
  const json = await res.json();
  return { status: res.status, resultado: json.data || json.error, assinatura, timestamp };
}

(async () => {
  const leitura = { deviceId: 'obd-veh_004', odometerKm: 28150, engineTempC: 96.5, batteryVoltage: 12.4, dtcCodes: [] };
  console.log('1) leitura normal assinada        ->', await enviar(leitura).then(r => [r.status, r.resultado]));
  const anomalia = { ...leitura, odometerKm: 28160, engineTempC: 124.8, dtcCodes: ['P0301'] };
  const primeira = await enviar(anomalia);
  console.log('2) anomalia (motor 124.8 C, P0301) ->', [primeira.status, primeira.resultado]);
  console.log('3) replay da mensagem anterior     ->', await enviar(anomalia, { timestamp: primeira.timestamp, assinaturaFixa: primeira.assinatura }).then(r => [r.status, r.resultado.code]));
  console.log('4) corpo adulterado em trânsito    ->', await enviar({ ...leitura, odometerKm: 28170 }, { adulterar: true }).then(r => [r.status, r.resultado.code]));
  console.log('5) timestamp antigo (10 min)       ->', await enviar({ ...leitura, odometerKm: 28180 }, { timestamp: Date.now() - 600000 }).then(r => [r.status, r.resultado.code]));
  console.log('6) dispositivo não cadastrado      ->', await enviar({ ...leitura, deviceId: 'obd-veh_999' }).then(r => [r.status, r.resultado.code]));
})();
