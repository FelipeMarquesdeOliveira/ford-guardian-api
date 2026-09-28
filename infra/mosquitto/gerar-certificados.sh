#!/bin/sh
# Gera uma CA local e certificados de broker e de dispositivo para testes (NÃO use em produção).
# As chaves privadas ficam fora do Git (ver .gitignore: infra/certs/*.key).
set -e
DIR="$(dirname "$0")/../certs"; mkdir -p "$DIR"; cd "$DIR"
openssl req -x509 -newkey rsa:3072 -nodes -days 365 -keyout ca.key -out ca.crt -subj "/CN=Ford Guardian IoT CA (teste)"
for nome in broker obd-veh_004; do
  openssl req -newkey rsa:2048 -nodes -keyout "$nome.key" -out "$nome.csr" -subj "/CN=$nome"
  openssl x509 -req -in "$nome.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 180 -out "$nome.crt"
  rm "$nome.csr"
done
chmod 600 ./*.key
echo "Certificados gerados em $DIR"
