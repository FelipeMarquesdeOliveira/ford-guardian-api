# Ford Guardian API - Sprint 3 Cybersecurity (DevSecOps)

[![DevSecOps](https://github.com/FelipeMarquesdeOliveira/ford-guardian-api/actions/workflows/devsecops.yml/badge.svg)](https://github.com/FelipeMarquesdeOliveira/ford-guardian-api/actions/workflows/devsecops.yml)

Backend do app **Ford Guardian** (Desafio 02 - Impulsionando o VIN Share, Ford x FIAP 2026): veículos, alertas
preditivos de manutenção, telemetria IoT e busca de concessionárias. Nesta sprint o trabalho de cibersegurança
evoluiu para **DevSecOps**: a segurança passou a fazer parte do ciclo de desenvolvimento, testes, deploy e operação.

> Dados mockados em memória (autorizado pelo professor). IoT e ML são simulados.

## Entregas da Sprint 3

| Atividade (peso) | Documento | Principais evidências |
|---|---|---|
| 1. Pipeline DevSecOps integrado (3,0) | [docs/01-pipeline-devsecops.md](docs/01-pipeline-devsecops.md) | [workflow](.github/workflows/devsecops.yml), [diagrama](docs/img/pipeline-devsecops.png), Semgrep 14 → 0, Trivy 8 HIGH → 0, Gitleaks no histórico |
| 2. Segurança em código e infraestrutura (2,5) | [docs/02-seguranca-codigo-infra.md](docs/02-seguranca-codigo-infra.md) | 11 correções no código, AES-256-GCM, JWT seguro, RBAC + BOLA, MQTT/TLS + HMAC, Dockerfile endurecido |
| 3. Observabilidade, monitoramento e resposta (2,0) | [docs/03-observabilidade.md](docs/03-observabilidade.md) e [docs/03b-resposta-a-incidentes.md](docs/03b-resposta-a-incidentes.md) | logs JSON, métricas Prometheus, 8 alertas, dashboard Grafana, 5 playbooks |
| 4. Compliance, riscos e segurança contínua (2,5) | [docs/04-compliance-riscos.md](docs/04-compliance-riscos.md) | STRIDE (21 ameaças), OWASP ASVS / API Top 10 / Mobile Top 10, LGPD, plano contínuo, checklist |

Relatórios das ferramentas e saídas das simulações: [docs/evidencias/](docs/evidencias/).

## Como executar

Pré-requisito: Node.js 22+.

```bash
npm ci
npm test                 # 39 testes de segurança com cobertura
npm run lint             # ESLint + eslint-plugin-security
npm run dev              # API em http://localhost:3000 (segredos aleatórios em modo dev)
```

Com Docker (API + Prometheus + Grafana):

```bash
./scripts/preparar-ambiente.sh       # cria .env com segredos aleatórios (não versionado)
docker compose up -d --build         # API :3000, Prometheus :9090, Grafana :3001
npm run trafego:demo                 # uso normal + ataques simulados (alimenta métricas e alertas)
IOT_HMAC_SECRET=<valor do .env> npm run iot:simular   # dispositivo IoT enviando telemetria assinada
```

## Contas de demonstração

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@ford.com` | `Admin@123` | `admin` (Administrador) |
| `analyst@ford.com` | `Analyst@123` | `analyst` (Gestor / analista de pós-venda) |
| `felipe@example.com` | `Felipe@123` | `user` (cliente) |
| `maria@example.com` | `Maria@123` | `user` (cliente) |

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` | público (rate limit 5/15 min) |
| POST | `/api/auth/logout` · GET `/api/auth/profile` | autenticado |
| GET/POST/PATCH/DELETE | `/api/vehicles`, `/api/vehicles/:id` | autenticado (cliente só os próprios) |
| GET | `/api/vehicles/health-stats` | `admin`, `analyst` |
| GET/PATCH | `/api/alerts`, `/api/alerts/:id/read`, `/api/alerts/:id/dismiss` | autenticado (cliente só os próprios) |
| GET | `/api/dealers`, `/api/dealers/search`, `/api/dealers/nearby` | autenticado |
| POST | `/api/telemetry` | dispositivo IoT (assinatura HMAC) |
| GET · DELETE · PATCH | `/api/privacy/me/export` · `/api/privacy/me` · `/api/privacy/me/consents` | titular (LGPD) |
| GET · POST | `/api/monitoring/status` · `/api/monitoring/users/:id/revoke-sessions` | `admin` |
| GET | `/metrics` | token do Prometheus |
| GET | `/health` | público |

## Estrutura

```
src/
├── app.js / index.js       # fábrica do Express (headers, CORS, rate limit, rotas) e servidor HTTP/HTTPS (TLS 1.2+)
├── config/                 # configuração validada (segredos obrigatórios em produção)
├── security/               # JWT e refresh tokens, AES-256-GCM, HMAC anti-replay
├── observability/          # logs JSON com redação, métricas Prometheus, eventos de segurança
├── middleware/             # autenticação, RBAC/BOLA, validação, rate limit, erros
├── controllers/ routes/    # auth, veículos, alertas, concessionárias, telemetria, privacidade, monitoramento
└── data/store.js           # repositório em memória (senhas bcrypt, PII cifrada)
infra/                      # Prometheus (alertas), Grafana (dashboard), Mosquitto (MQTT/TLS + ACL)
iot/                        # simulador de dispositivo OBD
.github/                    # pipeline DevSecOps e Dependabot
docs/                       # documentos das 4 atividades e evidências
```

## Equipe

| Nome | RM |
|---|---|
| Felipe Marques de Oliveira | 556319 |
| Gabriel Barros Cisoto | 556309 |
