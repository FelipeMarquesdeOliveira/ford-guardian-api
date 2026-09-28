#!/bin/sh
# Gera o .env com segredos aleatórios (nunca versionados) e o token que o Prometheus usa no /metrics.
set -e
cd "$(dirname "$0")/.."
[ -f .env ] && { echo ".env já existe; nada a fazer."; exit 0; }
METRICS_TOKEN=$(openssl rand -hex 24)
cat > .env <<ENV
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=15m
ENCRYPTION_KEY=$(openssl rand -base64 32)
IOT_HMAC_SECRET=$(openssl rand -hex 32)
METRICS_TOKEN=$METRICS_TOKEN
ALLOWED_ORIGINS=http://localhost:8081
LOG_LEVEL=info
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 18)
ENV
printf '%s' "$METRICS_TOKEN" > infra/prometheus/metrics_token
chmod 600 .env infra/prometheus/metrics_token
echo "Ambiente preparado: .env e infra/prometheus/metrics_token criados."
