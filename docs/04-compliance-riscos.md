# 04 - Compliance, Riscos e Segurança Contínua

Projeto: **Ford Guardian** (Desafio 02 - VIN Share / pós-venda)
Contexto: Ford x FIAP 2026 - Sprint 3 de Cybersecurity (modelo DevSecOps)
Escopo: App mobile Ford Guardian, API `ford-guardian-api`, dispositivo IoT/OBD e broker MQTT, dados e modelo de ML, pipeline CI/CD e cadeia de suprimentos.

> Observação: a API, o dispositivo IoT e o modelo de ML operam com dados mockados/sintéticos no ambiente acadêmico. Os controles descritos abaixo são os implementados no código e no pipeline, ou definidos na configuração de referência. Itens que dependem de infraestrutura corporativa (KMS/HSM, WAF, SIEM, pentest externo) estão marcados como Parcial ou Planejado.

---

## 1. Revisão final dos riscos - STRIDE + DevSecOps

### 1.1 Metodologia

- Modelagem de ameaças por componente com **STRIDE** (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Risco = Probabilidade x Impacto**, conforme a matriz abaixo.
- **Risco residual**: risco remanescente após os controles implementados.
- **Status**: `Mitigado` (controle implementado e verificado no pipeline/testes), `Parcial` (controle implementado com lacuna conhecida), `Planejado` (controle definido, ainda não implementado).

| Probabilidade \ Impacto | Baixo | Médio | Alto |
|---|---|---|---|
| **Alta** | Médio | Alto | Crítico |
| **Média** | Baixo | Médio | Alto |
| **Baixa** | Baixo | Baixo | Médio |

### 1.2 Tabela de ameaças

| ID | Componente | Categoria STRIDE | Ameaça | Prob. | Impacto | Risco inicial | Mitigação implementada | Risco residual | Status |
|---|---|---|---|---|---|---|---|---|---|
| S-01 | API (login) / App | Spoofing | Força bruta e credential stuffing contra `POST /api/auth/login` | Alta | Alto | Crítico | bcrypt custo 12; rate limit de login (5 tentativas/15 min); bloqueio de conta após 5 falhas; alerta `LoginFalhasElevadas`; mensagens de erro genéricas | Médio (sem MFA) | Parcial |
| S-02 | API | Spoofing | Forja ou reuso de JWT (alg `none`, troca de algoritmo, token de outro emissor) | Média | Alto | Alto | Algoritmo HS256 pinado na verificação; validação de `iss`, `aud`, `exp` e `jti`; access token de 15 min; segredo forte fora do código | Baixo | Mitigado |
| S-03 | Dispositivo IoT / Broker MQTT | Spoofing | Dispositivo falso publicando telemetria em nome de um veículo | Média | Alto | Alto | Autenticação usuário/senha no Mosquitto; ACL por dispositivo (cada dispositivo publica apenas no próprio tópico); assinatura HMAC-SHA256 da mensagem | Médio (sem certificado X.509 por dispositivo/mTLS) | Parcial |
| T-01 | Dispositivo IoT / API (`POST /api/telemetry`) | Tampering | Adulteração ou replay de telemetria em trânsito | Média | Alto | Alto | MQTT sobre TLS 1.2+ (porta 8883); HMAC-SHA256 sobre o payload + timestamp com janela anti-replay; rejeição com evento `iot.telemetry.rejected`; alerta `TelemetriaAssinaturaInvalida` | Baixo | Mitigado |
| T-02 | API | Tampering | Injeção (XSS, NoSQL/SQL, comando) e mass assignment via corpo, query ou parâmetros | Média | Alto | Alto | express-validator com regras por rota; sanitização de entrada; limite de payload de 10kb; dados em memória sem montagem de consultas dinâmicas | Baixo | Mitigado |
| T-03 | Pipeline CI/CD (supply chain) | Tampering | Dependência maliciosa ou vulnerável (typosquatting, pacote comprometido, CVE) | Média | Alto | Alto | `npm ci` com lockfile; `npm audit` em todo PR; Dependabot semanal; Semgrep; Trivy (imagem e config); gate bloqueia merge com achados HIGH/CRITICAL | Médio (sem SBOM publicado e sem assinatura de imagem) | Parcial |
| T-04 | App mobile | Tampering | App reempacotado ou modificado (engenharia reversa, hooking, remoção de checagens) | Média | Médio | Médio | Bytecode Hermes; nenhum segredo embarcado no bundle; toda autorização é decidida na API | Médio (sem R8/ofuscação dedicada, sem detecção de root/jailbreak e sem atestação de app) | Parcial |
| R-01 | API | Repudiation | Usuário ou administrador nega ter executado ação crítica (exclusão de veículo, alteração de dados, exportação LGPD) | Média | Médio | Médio | Trilha de auditoria de ações críticas com `userId`, perfil, `requestId`, IP e timestamp; logs estruturados JSON (winston) | Médio (logs sem armazenamento imutável e sem SIEM) | Parcial |
| I-01 | API | Information Disclosure | BOLA: cliente acessa veículo ou alerta de outro cliente alterando o `id` na URL | Alta | Alto | Crítico | Checagem de propriedade do objeto em veículos e alertas (dono do recurso ou perfil autorizado); resposta sem revelar existência do recurso; evento `authz.denied` | Baixo | Mitigado |
| I-02 | Dados / banco | Information Disclosure | Vazamento de dados pessoais em repouso (telefone, placa) por acesso indevido ao armazenamento ou backup | Média | Alto | Alto | Criptografia AES-256-GCM (node:crypto) com IV único e tag de autenticação; chave fornecida por variável de ambiente, fora do repositório | Médio (chave fora de KMS/HSM) | Parcial |
| I-03 | App mobile | Information Disclosure | Tokens e dados pessoais em AsyncStorage (texto claro) extraídos de dispositivo comprometido ou backup | Média | Alto | Alto | Access token de curta duração (15 min); refresh token rotativo e revogado no logout, o que limita a janela de uso | Alto (armazenamento local sem criptografia) | Planejado |
| I-04 | App mobile / API | Information Disclosure | Interceptação MITM em rede não confiável (Wi-Fi público, proxy malicioso) | Média | Alto | Alto | HTTPS obrigatório; HSTS via Helmet; TLS 1.2+ na borda | Médio (sem certificate pinning no app) | Parcial |
| I-05 | API / logs / métricas | Information Disclosure | Exposição de dados sensíveis em logs, stack traces ou no endpoint `/metrics` | Média | Médio | Médio | Redação de campos sensíveis no logger (senha, token, e-mail mascarado); handler de erro sem stack trace em produção; `/metrics` protegido | Baixo | Mitigado |
| I-06 | Modelo de ML | Tampering / Information Disclosure | Envenenamento do dataset de treino ou reidentificação de clientes a partir dos dados de treino e scores (FIEL, ABANDONO, ESQUECIDO, ECONOMICO) | Baixa | Alto | Médio | Treino com dados sintéticos pseudonimizados; minimização (sem nome, e-mail, telefone ou placa no dataset); treino offline, sem aprendizado a partir de entrada do usuário | Baixo (avaliação formal de reidentificação, monitoramento de drift e RIPD planejados) | Parcial |
| I-07 | Pipeline CI/CD / repositório | Information Disclosure | Segredos commitados no repositório (ocorrência real: `.env` de desenvolvimento no histórico em sprint anterior) | Alta | Alto | Crítico | Gitleaks em todo push/PR; `.env` removido e incluído no `.gitignore`; `.env.example` sem valores; todos os segredos expostos foram rotacionados, portanto os valores remanescentes no histórico estão invalidados | Baixo | Mitigado |
| I-08 | App mobile (integrações FIPE, Nominatim, Firebase) | Information Disclosure | Envio de localização e dados de uso a terceiros; consumo inseguro de resposta externa | Média | Médio | Médio | Chamadas via HTTPS; envio apenas das coordenadas necessárias à busca, sem identificador do cliente; Firebase opcional; tratamento de erro e timeout nas integrações | Médio (proxy pela API e validação de schema das respostas planejados) | Parcial |
| D-01 | API | Denial of Service | Flood de requisições, payloads grandes ou abuso de rotas de busca | Alta | Médio | Alto | Rate limiting global e por rota; limite de payload de 10kb; healthcheck do container; alerta de taxa de 5xx > 5% | Médio (sem WAF/CDN anti-DDoS) | Parcial |
| D-02 | Broker MQTT | Denial of Service | Flood de conexões ou mensagens por dispositivo comprometido | Média | Médio | Médio | Autenticação obrigatória (sem acesso anônimo); ACL por dispositivo; revogação individual de credencial | Médio (limites de conexão, taxa e tamanho de mensagem por cliente a configurar) | Parcial |
| E-01 | API | Elevation of Privilege | BFLA: perfil `user` acessando funções de `analyst` ou `admin` | Média | Alto | Alto | RBAC com 3 perfis (`admin`, `analyst`, `user`) aplicado por rota; perfil lido apenas do token assinado, nunca do corpo da requisição | Baixo | Mitigado |
| E-02 | Container / infraestrutura | Elevation of Privilege | Escalonamento de privilégio ou escape a partir do container da API | Baixa | Alto | Médio | Imagem `node:22-alpine` multi-stage; usuário não-root; `npm ci --omit=dev`; healthcheck; Trivy (imagem + config) e Hadolint no Dockerfile | Baixo | Mitigado |
| E-03 | Pipeline CI/CD / GitHub | Elevation of Privilege | Conta ou token do GitHub comprometido usado para alterar workflow ou burlar o gate de segurança | Baixa | Alto | Médio | Merge condicionado aos checks obrigatórios do pipeline; revisão de PR; segredos armazenados em GitHub Secrets | Médio (MFA obrigatório na organização, permissões mínimas do `GITHUB_TOKEN` e pin de actions por SHA planejados) | Parcial |

### 1.3 Resumo por status

| Status | Quantidade | IDs |
|---|---|---|
| Mitigado | 8 | S-02, T-01, T-02, I-01, I-05, I-07, E-01, E-02 |
| Parcial | 12 | S-01, S-03, T-03, T-04, R-01, I-02, I-04, I-06, I-08, D-01, D-02, E-03 |
| Planejado | 1 | I-03 |
| **Total** | **21** | Riscos iniciais Críticos (S-01, I-01, I-07) foram todos reduzidos a Médio ou Baixo |

### 1.4 Riscos residuais prioritários

| Prioridade | ID | Risco residual | Ação planejada |
|---|---|---|---|
| 1 | I-03 | Tokens em AsyncStorage sem criptografia | Migrar tokens para `expo-secure-store` (Keychain no iOS / Keystore no Android); manter em AsyncStorage apenas dados não sensíveis |
| 2 | I-04 | Ausência de certificate pinning | Implementar pinning de chave pública (SPKI) com pin de backup e procedimento de rotação |
| 3 | S-01 | Conta protegida apenas por senha | MFA (TOTP) obrigatório para `admin` e `analyst`, opcional para `user` |
| 4 | I-02 | Chave AES e segredos JWT/HMAC em variáveis de ambiente | Migrar para cofre gerenciado (AWS KMS / Azure Key Vault / HashiCorp Vault) com rotação automatizada |
| 5 | S-03 | Dispositivo autenticado por usuário/senha | Certificado X.509 por dispositivo (mTLS no broker) e provisionamento seguro de fábrica |
| 6 | D-01 | Sem proteção de borda | WAF e proteção anti-DDoS na frente da API |
| 7 | T-03 / E-03 | Cadeia de suprimentos sem SBOM e sem assinatura | Gerar SBOM (CycloneDX) no build, assinar imagem (cosign), pin de actions por SHA |
| 8 | R-01 | Logs sem retenção imutável | Centralizar logs em SIEM com retenção imutável e correlação de eventos |

---

## 2. Mapeamento com normas e boas práticas

### 2.1 OWASP ASVS 4.0.3 (alvo: nível 2)

| Capítulo | Requisito-chave | Como atendemos | Status |
|---|---|---|---|
| V1 Arquitetura e modelagem de ameaças | 1.1.2 Modelagem de ameaças a cada mudança de design ou sprint | STRIDE revisado nesta sprint (seção 1); revisão a cada release no plano contínuo | Conforme |
| V2 Autenticação | 2.4.1 / 2.4.4 Hash de senha aprovado (bcrypt com work factor >= 10); 2.2.1 controles anti-automação; 2.1.1 senha com no mínimo 12 caracteres | bcrypt custo 12; rate limit de login e bloqueio após 5 falhas. Política de senha exige complexidade, mas o comprimento mínimo ainda não está alinhado a 12 caracteres; MFA planejado | Parcial |
| V3 Gerenciamento de sessão | 3.5.3 Tokens stateless protegidos contra adulteração, replay e substituição de chave; 3.3.1 logout invalida a sessão | JWT HS256 pinado com `iss`, `aud`, `exp`, `jti`; access 15 min; refresh rotativo revogado no logout | Conforme |
| V4 Controle de acesso | 4.1.3 Menor privilégio; 4.2.1 Proteção contra IDOR/BOLA | RBAC com 3 perfis por rota; checagem de propriedade em veículos e alertas | Conforme |
| V5 Validação, sanitização e codificação | 5.1.3 Validação positiva (allowlist) de toda entrada | express-validator por rota (VIN com 17 caracteres, tipos, faixas, tamanhos); sanitização; payload máximo de 10kb | Conforme |
| V6 Criptografia armazenada | 6.2.2 Algoritmos aprovados; 6.4.1 Solução de gestão de segredos | AES-256-GCM com node:crypto para telefone e placa. Chaves em variáveis de ambiente, sem KMS/cofre | Parcial |
| V7 Tratamento de erros e logs | 7.1.1 Não registrar credenciais/tokens; 7.1.3 Registrar eventos de segurança; 7.4.1 Mensagem de erro genérica; 7.3.3 Proteção dos logs | Logs JSON com `requestId` e redação; eventos `auth.*`, `authz.*`, `iot.*`, `audit.*`; erros sem stack trace. Proteção/imutabilidade dos logs depende de SIEM (planejado) | Parcial |
| V8 Proteção de dados | 8.3.1 Dados sensíveis no corpo, não na query string; 8.3.2 Usuário pode exportar e remover seus dados | `GET /api/privacy/me/export` e `DELETE /api/privacy/me`; consentimento de telemetria/localização; minimização | Conforme |
| V9 Comunicação | 9.1.1 TLS em toda conectividade de cliente; 9.2.x TLS em conexões entre servidores | HTTPS + HSTS na API; MQTT sobre TLS 1.2+ na porta 8883. Sem certificate pinning no app; ambiente acadêmico sem certificado de produção | Parcial |
| V10 Código malicioso | 10.2.x Busca de código malicioso e backdoors; 10.3.2 Proteção de integridade (assinatura) | Semgrep e Gitleaks em todo push; revisão de PR. Assinatura de imagem/artefato planejada | Parcial |
| V11 Lógica de negócio | 11.1.4 Controles anti-automação contra chamadas excessivas | Rate limiting global, de login e de busca; anti-replay na telemetria | Conforme |
| V12 Arquivos e recursos | 12.x Upload e manipulação de arquivos | Não aplicável: a API não recebe upload de arquivos | N/A |
| V13 API e web service | 13.1.3 URLs sem dados sensíveis; 13.2.1 Métodos HTTP restritos; 13.2.5 Validação de `Content-Type` | Tokens apenas no header `Authorization`; rotas com métodos explícitos; `express.json` com limite de tamanho | Conforme |
| V14 Configuração | 14.2.1 Componentes atualizados; 14.4.x Cabeçalhos de segurança (CSP, HSTS); 14.3.2 Modo debug desativado | Dependabot + `npm audit` com gate; Helmet (HSTS, CSP); CORS por allowlist; container não-root com dependências de produção apenas | Conforme |

### 2.2 OWASP API Security Top 10 (2023)

| Item | Controle | Evidência |
|---|---|---|
| API1 Broken Object Level Authorization | Checagem de propriedade do objeto em veículos e alertas; perfis privilegiados com escopo definido | Middleware/controllers de veículos e alertas; casos de acesso cruzado na suíte Jest; evento `authz.denied` |
| API2 Broken Authentication | bcrypt 12; JWT HS256 com claims pinadas; access 15 min; refresh rotativo com revogação; rate limit e bloqueio de conta | Rotas `/api/auth/*`; eventos `auth.login.failed` e `auth.account.locked`; alerta `LoginFalhasElevadas` |
| API3 Broken Object Property Level Authorization | Validação com campos permitidos na entrada; respostas sem hash de senha e sem dados cifrados em claro | Regras do express-validator; revisão de serialização das respostas (Parcial) |
| API4 Unrestricted Resource Consumption | Rate limit global, de login e de busca; payload máximo de 10kb; paginação com limite | Configuração do rate limiter; alerta de taxa de 5xx |
| API5 Broken Function Level Authorization | RBAC por rota (`admin`, `analyst`, `user`); rotas administrativas e de estatísticas restritas | Middleware RBAC; casos de teste 403 por perfil |
| API6 Unrestricted Access to Sensitive Business Flows | Limite de tentativas em login; exportação LGPD autenticada e registrada na trilha de auditoria | Eventos `ratelimit.exceeded` e `audit.*` |
| API7 Server Side Request Forgery | A API não busca URLs fornecidas pelo usuário; integrações externas usam URLs fixas | Revisão de código; regras SSRF do Semgrep |
| API8 Security Misconfiguration | Helmet (HSTS, CSP), CORS por allowlist, erros genéricos, container não-root, Trivy config e Hadolint | Relatórios do pipeline (Trivy, Hadolint) |
| API9 Improper Inventory Management | Endpoints documentados no README; `/metrics` protegido; sem rotas de debug expostas | Especificação OpenAPI versionada e política de desativação de versões antigas planejadas (Parcial) |
| API10 Unsafe Consumption of APIs | Consumo de FIPE, Nominatim e Firebase via HTTPS com timeout e tratamento de erro; respostas tratadas como não confiáveis | Validação de schema das respostas e proxy pela API planejados (Parcial) |

### 2.3 OWASP Mobile Top 10 (2024)

| Item | Controle no app Ford Guardian | Status |
|---|---|---|
| M1 Improper Credential Usage | Nenhuma chave, segredo ou credencial fixa no bundle; autenticação sempre via API com JWT de curta duração | Conforme |
| M2 Inadequate Supply Chain Security | Lockfile versionado, `npm audit` e Dependabot também no repositório do app; SDKs de terceiros limitados (Expo, Firebase opcional) | Parcial |
| M3 Insecure Authentication/Authorization | Autorização decidida no servidor (RBAC + BOLA); app não confia em flags locais; logout revoga refresh token | Conforme |
| M4 Insufficient Input/Output Validation | Validação de formulários no app (VIN, placa, e-mail) e validação definitiva na API; saída renderizada por componentes nativos React Native | Conforme |
| M5 Insecure Communication | HTTPS obrigatório (ATS no iOS, bloqueio de cleartext no Android); certificate pinning planejado | Parcial |
| M6 Inadequate Privacy Controls | Consentimento explícito para localização e telemetria; permissão de localização solicitada apenas no uso da busca de concessionária; exportação e exclusão de dados | Conforme |
| M7 Insufficient Binary Protections | Hermes (bytecode); ofuscação R8/ProGuard no build Android, detecção de root/jailbreak e Play Integrity/App Attest planejados | Parcial |
| M8 Security Misconfiguration | Build de produção sem modo debug; `android:allowBackup` desativado e permissões mínimas no manifesto a validar no build de release | Parcial |
| M9 Insecure Data Storage | Tokens hoje em AsyncStorage; migração para `expo-secure-store` (Keychain/Keystore) planejada | Não conforme (planejado) |
| M10 Insufficient Cryptography | Criptografia forte no servidor (AES-256-GCM, bcrypt, HMAC-SHA256) e TLS no transporte; app não implementa criptografia própria | Conforme |

### 2.4 LGPD (Lei 13.709/2018)

#### 2.4.1 Inventário de dados pessoais

| Dado | Categoria | Finalidade | Base legal (art. 7º) | Retenção |
|---|---|---|---|---|
| Nome, e-mail, telefone (telefone cifrado) | Cadastral | Criar e manter a conta, autenticar, contato sobre revisões e alertas | V - execução de contrato | Enquanto a conta estiver ativa; após exclusão, anonimização, ressalvada guarda legal (art. 16) |
| Hash de senha (bcrypt) | Autenticação | Autenticar o titular | V - execução de contrato | Até a exclusão da conta |
| VIN, placa (cifrada), modelo, ano, quilometragem | Dados do veículo vinculados ao titular | Gestão do veículo, alertas preditivos e pós-venda | V - execução de contrato | Enquanto o veículo estiver vinculado à conta |
| Localização do dispositivo (latitude/longitude) | Geolocalização | Buscar concessionária próxima | I - consentimento (permissão do sistema + aceite no app) | Uso transitório: não persistida pela API; coordenadas não registradas nos logs |
| Telemetria do veículo (odômetro, bateria, óleo, pneus, códigos de falha) | Telemetria IoT | Manutenção preditiva e alertas | I - consentimento (opt-in de telemetria, revogável) | 12 meses em forma detalhada; após isso, agregada/anonimizada |
| Histórico de manutenção e agendamentos | Pós-venda | Histórico de revisões, garantia e campanhas de recall | V - execução de contrato; II - obrigação legal (CDC, recall) | 5 anos após o serviço (prazo do art. 27 do CDC) |
| Dados usados no ML (perfil e score de evasão) | Pseudonimizados (art. 13, §4º) | Segmentação de pós-venda e ações de retenção | IX - legítimo interesse, com teste de balanceamento (art. 10) e direito de oposição | Dataset de treino sintético; scores recalculados periodicamente e descartados após 12 meses |
| Logs de acesso e trilha de auditoria (IP, `userId`, `requestId`, data/hora) | Registros de segurança | Segurança, auditoria e cumprimento do Marco Civil | II - obrigação legal (Lei 12.965/2014, art. 15); IX - legítimo interesse (segurança) | Logs de acesso: 6 meses; trilha de auditoria de ações críticas: 12 meses |
| Registro de consentimentos (finalidade, versão do termo, data/hora) | Prova de consentimento | Demonstrar o consentimento (art. 8º, §2º) | II - obrigação legal | Enquanto durar o tratamento e até 5 anos após a revogação |
| Identificador e credencial do dispositivo IoT | Dispositivo vinculado ao veículo | Autenticar o dispositivo no broker | V - execução de contrato | Enquanto o dispositivo estiver ativo; revogado na desvinculação |

Compartilhamento e transferência internacional: Nominatim (OpenStreetMap) e Firebase (opcional) podem processar dados fora do Brasil. Nesses casos aplica-se o art. 33 da LGPD e a Resolução CD/ANPD nº 19/2024 (cláusulas-padrão contratuais); a política de privacidade do app informa esses destinatários.

#### 2.4.2 Princípios do art. 6º aplicados

| Princípio | Aplicação no Ford Guardian |
|---|---|
| Finalidade | Cada dado tem finalidade declarada no inventário e na política de privacidade |
| Adequação | Telemetria usada apenas para manutenção preditiva; localização apenas para busca de concessionária |
| Necessidade | Localização não persistida; dataset de ML sem identificadores diretos; logs com e-mail mascarado |
| Livre acesso | Exportação completa via `GET /api/privacy/me/export` |
| Qualidade dos dados | Titular pode corrigir cadastro e dados do veículo pelo app |
| Transparência | Política de privacidade e telas de consentimento em linguagem clara |
| Segurança | Criptografia AES-256-GCM, bcrypt, TLS, RBAC, BOLA, rate limiting |
| Prevenção | Pipeline DevSecOps com gates; modelagem de ameaças a cada release |
| Não discriminação | Score de evasão usado para ofertas de retenção, sem negar serviço, garantia ou preço |
| Responsabilização e prestação de contas | Trilha de auditoria, este documento, checklist de conformidade e plano de resposta a incidentes |

#### 2.4.3 Direitos do titular (art. 18) e atendimento

| Direito | Como é atendido |
|---|---|
| I - Confirmação da existência de tratamento | `GET /api/privacy/me/export` |
| II - Acesso aos dados | `GET /api/privacy/me/export` (JSON estruturado) |
| III - Correção | Edição de perfil e de veículo pelo app (rotas autenticadas da API) |
| IV - Anonimização, bloqueio ou eliminação de dados desnecessários | `DELETE /api/privacy/me` (anonimização de dados cadastrais e eliminação dos dados não sujeitos a guarda legal) |
| V - Portabilidade | `GET /api/privacy/me/export` em formato estruturado e interoperável (JSON) |
| VI - Eliminação dos dados tratados com consentimento | `DELETE /api/privacy/me` e revogação do consentimento de telemetria/localização |
| VII - Informação sobre compartilhamento | Política de privacidade (concessionárias, provedores de integração) |
| VIII - Informação sobre a possibilidade de não consentir | Telas de consentimento informam que o app funciona sem telemetria e sem localização |
| IX - Revogação do consentimento | Endpoint de consentimento da API (telemetria e localização), a qualquer momento |
| Art. 20 - Revisão de decisões automatizadas | Score de ML não gera, sozinho, decisão com efeito relevante; revisão humana pelo analista de pós-venda e solicitação via encarregado |

Prazo de resposta (art. 19): confirmação e acesso em formato simplificado de imediato pelo endpoint; declaração completa em até 15 dias.

#### 2.4.4 Segurança, incidentes e governança

- **Art. 46 - Segurança**: controles técnicos da seção 1 (criptografia em repouso e em trânsito, controle de acesso, logs, pipeline DevSecOps) e administrativos (plano de resposta a incidentes, auditoria de permissões, treinamento).
- **Art. 48 - Comunicação de incidente**: incidentes que possam acarretar risco ou dano relevante aos titulares são comunicados à ANPD e aos titulares em até **3 dias úteis** a partir do conhecimento de que o incidente afetou dados pessoais, conforme a **Resolução CD/ANPD nº 15/2024**. O registro de todos os incidentes, inclusive os não comunicados, é mantido por no mínimo 5 anos. Procedimento detalhado em `03b-resposta-a-incidentes.md` (playbook 4).
- **Encarregado (DPO) - art. 41**: encarregado designado, com identidade e canal de contato publicados no app e na política de privacidade (Resolução CD/ANPD nº 18/2024). Responsável por atender titulares, interagir com a ANPD e participar da resposta a incidentes.
- **RIPD - art. 38**: recomendado Relatório de Impacto à Proteção de Dados para (a) telemetria veicular contínua, (b) geolocalização e (c) perfilamento de clientes pelo modelo de ML, por envolverem monitoramento e decisões baseadas em perfil. Status: planejado.

---

## 3. Plano de segurança contínua

### 3.1 Rotinas

| Rotina | Frequência | Responsável | Ferramenta | Evidência gerada |
|---|---|---|---|---|
| Revisão de dependências (SCA) | `npm audit` em todo PR; Dependabot semanal; revisão consolidada mensal | Time de desenvolvimento / DevSecOps | npm audit, Dependabot | PRs do Dependabot, resultado do job de SCA, ata da revisão mensal |
| SAST | Todo push e PR | DevSecOps | Semgrep (regras OWASP, Node.js, JWT, secrets) | Relatório SARIF na aba Security do GitHub, status do gate |
| Secret scanning | Todo push e PR | DevSecOps | Gitleaks | Relatório do job; bloqueio do PR em caso de achado |
| Scan de container e IaC | Todo build de imagem | DevSecOps | Trivy (imagem + config), Hadolint | Relatórios Trivy/Hadolint anexados ao workflow |
| DAST | Semanal (baseline) no ambiente de homologação | Segurança | OWASP ZAP baseline | Relatório HTML/JSON do ZAP e issues abertas |
| Pentest | Anual e antes de releases com mudança relevante de arquitetura | Empresa externa especializada | Metodologia OWASP WSTG / MASTG | Relatório de pentest e plano de correção |
| Auditoria de permissões | Trimestral | Segurança + líder técnico | Consulta de usuários por perfil na API; auditoria de membros e acessos no GitHub | Relatório de usuários por perfil (`admin`, `analyst`, `user`), contas inativas desativadas, acessos revistos ao GitHub, CI e segredos |
| Rotação de segredos | A cada 90 dias e imediatamente após suspeita de exposição | DevSecOps | GitHub Secrets / cofre de segredos | Registro de rotação de `JWT_SECRET`, segredo de refresh, chaves HMAC e chave AES (data, responsável, motivo) |
| Backup | Diário, criptografado | Operações | Backup gerenciado do banco + criptografia AES-256 | Log de execução do backup; retenção de 30 dias |
| Teste de restauração | Mensal | Operações | Restauração em ambiente isolado | Relatório com tempo de restauração comparado ao RTO de 4h e ponto de recuperação comparado ao RPO de 24h |
| Revisão do modelo de ameaças | A cada release e a cada mudança de arquitetura | Segurança + arquitetura | STRIDE (este documento) | Tabela da seção 1 atualizada e versionada no repositório |
| Revisão de alertas e dashboards | Mensal | Segurança / SRE | Prometheus + Grafana | Ajuste de limiares, registro de falsos positivos |
| Exercício de resposta a incidentes (tabletop) | Semestral | Incident Commander + DPO | Playbooks de `03b-resposta-a-incidentes.md` | Ata do exercício e melhorias identificadas |
| Revisão LGPD (inventário, retenção, consentimentos) | Semestral | Encarregado (DPO) | Inventário de dados (seção 2.4.1) | Inventário atualizado, evidência de descarte conforme retenção |

### 3.2 Parâmetros de continuidade

| Parâmetro | Valor definido |
|---|---|
| RPO (perda máxima de dados) | 24 horas |
| RTO (tempo máximo de recuperação) | 4 horas |
| Retenção de backup | 30 dias |
| Criptografia de backup | AES-256, chave separada do ambiente de produção |

### 3.3 Métricas de segurança

| Métrica | Definição | Meta |
|---|---|---|
| MTTD (tempo médio de detecção) | Tempo entre o início do evento e o disparo do alerta ou abertura do incidente | Menor que 15 min para eventos cobertos por alertas Prometheus |
| MTTR (tempo médio de resposta/recuperação) | Tempo entre a detecção e a recuperação do serviço | Dentro do tempo-alvo da severidade (SEV1: 4h) |
| % de PRs com gate verde na primeira execução | PRs aprovados em SAST, SCA, secret scan e Trivy sem retrabalho / total de PRs | Tendência de alta mês a mês |
| Vulnerabilidades abertas por severidade | Contagem de achados CRITICAL, HIGH, MEDIUM e LOW em aberto | CRITICAL e HIGH: zero em produção |
| Prazo de correção (SLA) | Tempo entre a detecção e a correção | CRITICAL: 7 dias; HIGH: 30 dias; MEDIUM: 90 dias; LOW: próximo ciclo |
| Idade dos segredos | Dias desde a última rotação de cada segredo | Menor ou igual a 90 dias |
| Cobertura de testes | Percentual de cobertura do Jest nos módulos de segurança | Não reduzir entre releases |

---

## 4. Checklist de conformidade

| # | Item | Norma de referência | Status | Evidência |
|---|---|---|---|---|
| 1 | Senhas armazenadas com hash forte (bcrypt custo 12) | ASVS 2.4.1 / 2.4.4; LGPD art. 46 | Conforme | Serviço de autenticação; teste de hash |
| 2 | Política de senha com comprimento mínimo de 12 caracteres | ASVS 2.1.1 | Parcial | Validador exige complexidade; comprimento mínimo a ajustar |
| 3 | Proteção contra força bruta (rate limit de login + bloqueio de conta) | ASVS 2.2.1; API2 | Conforme | Rate limiter de login; eventos `auth.account.locked` |
| 4 | MFA para perfis `admin` e `analyst` | ASVS V2 (nível 2); API2 | Não conforme - planejado | Seção 1.4, prioridade 3 |
| 5 | JWT com expiração curta, claims validadas e refresh rotativo revogável | ASVS 3.5.3 / 3.3.1; API2 | Conforme | Middleware de autenticação; rota de logout |
| 6 | RBAC com menor privilégio | ASVS 4.1.3; API5 | Conforme | Middleware RBAC; testes 403 por perfil |
| 7 | Autorização por objeto (BOLA) em veículos e alertas | ASVS 4.2.1; API1 | Conforme | Checagem de propriedade; evento `authz.denied` |
| 8 | Autorização por propriedade (campos de entrada e saída) | API3 | Parcial | Allowlist na validação; revisão de serialização pendente |
| 9 | Rate limiting global e limite de payload (10kb) | API4; ASVS 11.1.4 | Conforme | Configuração do Express e do rate limiter |
| 10 | Validação e sanitização de entrada | ASVS 5.1.3; M4 | Conforme | Regras express-validator por rota |
| 11 | Cabeçalhos de segurança (HSTS, CSP) e CORS por allowlist | ASVS 14.4; API8 | Conforme | Configuração Helmet e CORS |
| 12 | TLS 1.2+ em API e MQTT (porta 8883) | ASVS 9.1.1 / 9.2; M5 | Parcial | Configuração de referência definida; ambiente acadêmico sem certificado de produção |
| 13 | Certificate pinning no app | M5 | Não conforme - planejado | Seção 1.4, prioridade 2 |
| 14 | Criptografia de dados pessoais em repouso (AES-256-GCM) | ASVS 6.2.2; LGPD art. 46 | Conforme | Utilitário de criptografia (node:crypto) |
| 15 | Gestão de chaves em cofre (KMS/HSM) | ASVS 6.4.1 | Parcial | Chaves em variáveis de ambiente com rotação de 90 dias; cofre planejado |
| 16 | Armazenamento seguro de tokens no app (Keychain/Keystore) | M9; M1 | Não conforme - planejado | Seção 1.4, prioridade 1 |
| 17 | Segredos fora do código e do repositório | ASVS 2.10.4; M1 | Conforme | Gitleaks; `.gitignore`; `.env.example`; rotação após o achado da sprint anterior |
| 18 | Integridade e anti-replay da telemetria (HMAC-SHA256 + timestamp) | ASVS 13 / 9; IoT | Conforme | Middleware HMAC de `POST /api/telemetry` |
| 19 | Autenticação e ACL por dispositivo no broker MQTT | ASVS 4.1.3; boas práticas IoT | Conforme | Configuração do Mosquitto (password file + ACL) |
| 20 | Logs e mensagens de erro sem dados sensíveis ou stack trace | ASVS 7.1.1 / 7.4.1; LGPD art. 46 | Conforme | Logger winston com redação; handler de erro |
| 21 | Trilha de auditoria de ações críticas | ASVS 7.1.3; LGPD art. 37 | Conforme | Eventos `audit.*` com `userId` e `requestId` |
| 22 | Monitoramento e alertas de segurança | ASVS 7.1.3; NIST CSF DE.CM | Conforme | Prometheus + Grafana; regras de alerta (falhas de login, 401/403, 5xx, assinatura IoT, bloqueios) |
| 23 | Centralização e proteção de logs contra alteração (SIEM) | ASVS 7.3.3 | Parcial | Logs estruturados prontos para ingestão; SIEM planejado |
| 24 | SAST no pipeline com gate | ASVS 10.2; DevSecOps | Conforme | Job Semgrep no GitHub Actions |
| 25 | SCA no pipeline com gate e Dependabot | ASVS 14.2.1; M2 | Conforme | Job `npm audit`; configuração do Dependabot |
| 26 | Scan de container/IaC e imagem não-root | ASVS 14.1; CIS Docker Benchmark | Conforme | Dockerfile multi-stage; jobs Trivy e Hadolint |
| 27 | SBOM e assinatura de artefatos | ASVS 10.3.2 | Não conforme - planejado | Seção 1.4, prioridade 7 |
| 28 | DAST (ZAP baseline) e pentest externo | ASVS V1; OWASP WSTG | Não conforme - planejado | Seção 3.1 |
| 29 | Backup criptografado e teste de restauração | LGPD art. 46; ISO/IEC 27001 A.8.13 | Parcial | Política definida (RPO 24h / RTO 4h); dados atuais mockados em memória |
| 30 | Direitos do titular (acesso, portabilidade, eliminação) | LGPD art. 18; ASVS 8.3.2 | Conforme | `GET /api/privacy/me/export`; `DELETE /api/privacy/me` |
| 31 | Gestão e registro de consentimento (telemetria e localização) | LGPD art. 7º I e art. 8º | Conforme | Endpoint de consentimento; registro com data/hora e finalidade |
| 32 | Política de retenção e descarte por categoria de dado | LGPD art. 15 e 16 | Parcial | Rotina de retenção implementada; alinhamento dos prazos ao inventário (seção 2.4.1) pendente |
| 33 | Encarregado (DPO) designado e canal publicado | LGPD art. 41 | Parcial | Papel definido; canal a publicar no app |
| 34 | RIPD para telemetria, localização e perfilamento | LGPD art. 38 | Não conforme - planejado | Seção 2.4.4 |
| 35 | Plano de resposta a incidentes com comunicação à ANPD | LGPD art. 48; Resolução CD/ANPD nº 15/2024 | Conforme | `03b-resposta-a-incidentes.md` |
| 36 | Modelo de ameaças revisado a cada release | ASVS 1.1.2 | Conforme | Seção 1 deste documento |

### 4.1 Resultado

| Status | Itens | Percentual |
|---|---|---|
| Conforme | 22 | 61,1% |
| Parcial | 8 | 22,2% |
| Não conforme - planejado | 6 | 16,7% |
| **Total** | **36** | **100%** |

- **Conformidade estrita** (apenas itens Conforme): 22 / 36 = **61,1%**.
- **Conformidade ponderada** (Conforme = 1; Parcial = 0,5; Não conforme = 0): (22 + 4) / 36 = **72,2%**.

Os 6 itens não conformes estão todos com ação definida na seção 1.4 e no plano de segurança contínua (seção 3), com prioridade para armazenamento seguro de tokens no app, certificate pinning e MFA.
