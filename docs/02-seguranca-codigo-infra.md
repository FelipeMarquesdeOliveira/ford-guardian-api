# 2. Segurança em código e infraestrutura

Correções e melhorias **reais** aplicadas nesta sprint no repositório `ford-guardian-api`. Todos os controles têm
teste automatizado (39 testes em `tests/`) e o resultado da execução está em [`evidencias/`](evidencias/).

## 2.1 Problemas encontrados no código da sprint anterior

| # | Problema (Sprint 1/2) | Risco | Correção na Sprint 3 |
|---|---|---|---|
| 1 | A API não iniciava: `app.use()` recebia objetos (`rateLimiter`, `errorHandler`, `auditTrail`) em vez de funções | indisponibilidade; nenhum controle ativo | app refeito como fábrica (`src/app.js`) com cada middleware registrado corretamente |
| 2 | `.env` com segredos commitado no repositório | vazamento de credenciais | arquivo removido, `.gitignore`, `.env.example` sem valores, segredos revogados; em produção a API não sobe sem os segredos |
| 3 | Rotas `/api/monitoring` sem autenticação | exposição de dados de segurança | exigem JWT e perfil `admin` |
| 4 | Qualquer usuário marcava como lido o alerta de outro (sem checagem de dono) | BOLA (OWASP API1) | `garantirPropriedade()` em veículos e alertas |
| 5 | Cadastro aceitava o campo `role` na validação | escalada de privilégio (mass assignment) | `role` é proibido no cadastro; o perfil é sempre `user` |
| 6 | Senhas re-hasheadas com bcrypt a cada login (5 hashes por requisição) | DoS por consumo de CPU | hash feito uma vez na carga dos dados |
| 7 | `crypto-js` com senha como chave (KDF fraca, MD5) | criptografia fraca | AES-256-GCM do `node:crypto` com chave de 32 bytes e tag de 16 bytes |
| 8 | Middleware de autenticação assíncrono lançando exceção | requisição travada / erro não tratado | fluxo síncrono com `next(err)` e wrapper para handlers assíncronos |
| 9 | Login exigia senha forte na validação | vazava a política e barrava usuários legítimos | complexidade exigida só no cadastro |
| 10 | Refresh token JWT sem rotação nem revogação; logout sem efeito | sessão roubada válida por 7 dias | refresh opaco rotativo com detecção de reuso; logout revoga refresh e access token |
| 11 | Assinatura HMAC opcional (sem header, a requisição passava) | integridade não garantida | telemetria IoT só é aceita com HMAC válido, timestamp na janela e sem replay |

## 2.2 Criptografia local

**API:** dados pessoais sensíveis (telefone e placa) ficam cifrados em repouso com AES-256-GCM, que garante
confidencialidade e integridade. Cada valor usa IV aleatório e a tag de autenticação tem tamanho fixo
(achado do Semgrep corrigido).

```js
// src/security/crypto.js
const cipher = crypto.createCipheriv('aes-256-gcm', config.encryptionKey, iv, { authTagLength: 16 });
...
if (tagBuffer.length !== TAG_BYTES) throw new Error('Tag de autenticação inválida');
const decipher = crypto.createDecipheriv('aes-256-gcm', config.encryptionKey, iv, { authTagLength: 16 });
```

- Senhas: bcrypt com custo 12 (nunca reversíveis).
- Refresh tokens: somente o hash SHA-256 é guardado.
- Pseudonimização por HMAC para os dados usados no ML (`pseudonimizar()`), sem expor o id real do cliente.
- **App mobile (recomendação implementável):** trocar o `AsyncStorage` por `expo-secure-store` (Keychain/Keystore) para
  guardar tokens, e não embutir chaves de API no bundle.

Testes: cifra/decifra, IV diferente a cada cifragem, detecção de adulteração (`tests/seguranca-unitario.test.js`).

## 2.3 Hardening da API

| Controle | Implementação | Teste |
|---|---|---|
| Rate limit | global (100 req/15 min por IP), login/cadastro/refresh (5/15 min), buscas (30/min); resposta `429` e evento `ratelimit.exceeded` | `hardening.test.js` |
| Bloqueio de conta | 5 falhas em 15 min bloqueiam a conta (`423`), mesmo com o atacante trocando de IP | `auth.test.js` |
| Validação de entrada | express-validator em todas as rotas (VIN ISO 3779, placa, e-mail, faixas numéricas, formato dos ids); sanitização de XSS e de `__proto__` | `hardening.test.js` |
| Limite de payload | 10kb (`413`) | `hardening.test.js` |
| JWT seguro | HS256 fixado (rejeita `alg: none`), `iss`, `aud`, `jti`, 15 min, claim `typ`; segredo de 32+ bytes obrigatório | `auth.test.js` |
| Sessão | refresh token opaco rotativo, reuso revoga todas as sessões, logout revoga o access token (denylist por `jti`) | `auth.test.js` |
| Headers | Helmet: HSTS (1 ano, preload), CSP `default-src 'none'`, `nosniff`, sem `X-Powered-By` | `hardening.test.js` |
| CORS | somente origens da allowlist (`ALLOWED_ORIGINS`) | - |
| Erros | resposta padronizada `{ code, message, requestId }`, sem stack trace | `hardening.test.js` |
| Enumeração de usuários | mesma mensagem e tempo de resposta para e-mail inexistente e senha errada | `auth.test.js` |
| TLS | servidor HTTPS com `minVersion: 'TLSv1.2'` quando há certificado (`TLS_CERT_PATH`/`TLS_KEY_PATH`) | - |

## 2.4 Controle de acesso por perfil

| Perfil do enunciado | Perfil na API | Pode |
|---|---|---|
| Administrador | `admin` | tudo, inclusive monitoramento de segurança e revogação de sessões |
| Gestor | `analyst` (gestor/analista de pós-venda Ford) | ver toda a frota e estatísticas; não acessa o monitoramento |
| Usuário final (no enunciado genérico, "Brigadista") | `user` (cliente dono do veículo) | apenas os próprios veículos, alertas e dados |

- `requireRole()` barra o perfil antes do controller (`403` + evento `authz.denied`).
- `garantirPropriedade()` barra o acesso a objetos de outro cliente (`403` + evento `authz.bola.blocked`).
- O cliente não altera `healthStatus` (propriedade reservada a analistas, OWASP API3).

Evidência da execução com ataques simulados ([`evidencias/trafego-ataques.txt`](evidencias/trafego-ataques.txt)):

| Ataque simulado | Resposta da API |
|---|---|
| Força bruta em 3 contas | 15 × `401`, depois 3 × `423` (conta bloqueada) |
| Cliente lendo veículo/alerta de outra pessoa (BOLA) | 24 × `403` |
| Cliente chamando rota de administrador | 10 × `403` |
| Token forjado com `alg: none` | 10 × `401` |
| Telemetria sem a chave do dispositivo | 8 × `401` |
| Rajada acima do limite global | `429` ([`trafego-rate-limit-global.txt`](evidencias/trafego-rate-limit-global.txt)) |

## 2.5 Segurança MQTT/TLS para IoT (mock)

O dispositivo OBD do veículo envia telemetria. A solução tem duas camadas:

1. **Transporte (broker Mosquitto, [`infra/mosquitto/`](../infra/mosquitto/)):** somente porta 8883 com TLS 1.2+,
   autenticação mútua por certificado (`require_certificate true`), sem acesso anônimo, usuário/senha por dispositivo e
   ACL em que cada dispositivo só publica no próprio tópico (`ford/veiculos/%u/telemetria`). A porta 1883 (texto claro)
   não é exposta. O script `gerar-certificados.sh` cria uma CA de teste; as chaves privadas ficam fora do Git.
2. **Mensagem (implementado e testado):** cada leitura é assinada com HMAC-SHA256 (`timestamp.corpo`). A API rejeita
   assinatura inválida, corpo adulterado, timestamp fora da janela de 5 minutos, reenvio (replay) e dispositivo não
   cadastrado, e só aceita a coleta se o titular consentiu (LGPD).

Execução do simulador ([`evidencias/simulador-iot.txt`](evidencias/simulador-iot.txt)):

```
1) leitura normal assinada         -> 202 aceita
2) anomalia (motor 124.8 C, P0301) -> 202 aceita, gera alerta crítico
3) replay da mensagem anterior     -> 401 REPLAYED_MESSAGE
4) corpo adulterado em trânsito    -> 401 INVALID_SIGNATURE
5) timestamp antigo (10 min)       -> 401 STALE_TIMESTAMP
6) dispositivo não cadastrado      -> 401 UNKNOWN_DEVICE
```

A configuração do broker é entregue como infraestrutura mockada: o transporte MQTT não foi executado neste ambiente.
A camada de mensagem foi executada e testada.

## 2.6 IaC Security

| Arquivo | Boas práticas aplicadas | Verificação |
|---|---|---|
| `Dockerfile` | multi-stage; `node:22-alpine`; `npm ci --omit=dev --ignore-scripts`; `apk upgrade`; **npm/corepack removidos do runtime**; usuário 1000 (não-root); `HEALTHCHECK` | Hadolint 0, Trivy config 0, Trivy image 0 HIGH/CRITICAL |
| `docker-compose.yml` | `read_only`, `tmpfs /tmp`, `no-new-privileges`, `cap_drop: ALL`, limites de CPU/memória, segredos via `.env` não versionado; Grafana sem cadastro e sem acesso anônimo | Trivy config |
| `infra/prometheus/prometheus.yml` | scrape do `/metrics` com token (`credentials_file`), sem expor métricas publicamente | - |
| `infra/mosquitto/*` | TLS obrigatório, sem anônimo, ACL mínima | revisão manual |

## 2.7 Commits da sprint

O histórico da branch `sprint-3-devsecops` separa cada correção em um commit (ver `git log`), por exemplo:
remoção do `.env`, correção da inicialização, JWT/refresh, BOLA, criptografia, pipeline e observabilidade.
