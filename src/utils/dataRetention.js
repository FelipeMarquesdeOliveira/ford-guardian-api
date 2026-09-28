/** Política de retenção (LGPD art. 15/16): prazos por tipo de dado e anonimização ao final. */
const DATA_RETENTION_POLICY = {
  users: { retentionDays: 365 * 5, acao: 'anonimizar após encerramento da conta' },
  vehicles: { retentionDays: 365 * 5, acao: 'excluir junto com a conta' },
  alerts: { retentionDays: 180, acao: 'excluir' },
  telemetry: { retentionDays: 90, acao: 'agregar e excluir dado bruto' },
  securityLogs: { retentionDays: 180, acao: 'excluir' }
};

function deveReter(tipo, criadoEm, agora = new Date()) {
  const politica = DATA_RETENTION_POLICY[tipo];
  if (!politica) return true;
  const dias = (agora - new Date(criadoEm)) / (1000 * 60 * 60 * 24);
  return dias < politica.retentionDays;
}

module.exports = { DATA_RETENTION_POLICY, deveReter };
