const mockAlerts = [
  {
    id: 'alt_001',
    vehicleId: 'veh_002',
    type: 'oil_change',
    severity: 'moderate',
    title: 'Troca de Óleo Recomendada',
    description: 'Seu veículo precisa de troca de óleo. O óleo atual está com 5.000 km de uso.',
    recommendedAction: 'Visitar concessionária para troca de óleo e filtro.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-10T08:00:00.000Z',
    expiresAt: '2024-06-10T08:00:00.000Z'
  },
  {
    id: 'alt_002',
    vehicleId: 'veh_004',
    type: 'engine_failure_risk',
    severity: 'critical',
    title: 'Risco de Falha no Motor',
    description: 'Sensores detectaram comportamento anômalo. Possível falha no sistema de ignição.',
    recommendedAction: 'Procurar oficina imediatamente. Não continuar dirigindo.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-15T14:30:00.000Z',
    expiresAt: '2024-05-22T14:30:00.000Z'
  },
  {
    id: 'alt_003',
    vehicleId: 'veh_004',
    type: 'brake_inspection',
    severity: 'high',
    title: 'Inspeção de Freios Necessária',
    description: 'Pastas de freio com desgaste acelerado detectado. Eficiência em 30%.',
    recommendedAction: 'Agendar inspeção de freios com urgência.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-12T10:00:00.000Z',
    expiresAt: '2024-05-26T10:00:00.000Z'
  },
  {
    id: 'alt_004',
    vehicleId: 'veh_005',
    type: 'preventive_review',
    severity: 'low',
    title: 'Revisão Preventiva Programada',
    description: 'Seu veículo está no tempo de revisão preventiva de 10.000 km.',
    recommendedAction: 'Agendar revisão preventiva na concessionária.',
    isRead: true,
    isDismissed: false,
    createdAt: '2024-05-08T09:00:00.000Z',
    expiresAt: '2024-06-08T09:00:00.000Z'
  },
  {
    id: 'alt_005',
    vehicleId: 'veh_002',
    type: 'tire_rotation',
    severity: 'moderate',
    title: 'Rodízio de Pneus Recomendado',
    description: 'Pneus com desgaste irregular. Rodízio necessário aos 45.000 km.',
    recommendedAction: 'Visitar concessionária para rodízio e balanceamento.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-14T11:00:00.000Z',
    expiresAt: '2024-05-28T11:00:00.000Z'
  },
  {
    id: 'alt_006',
    vehicleId: 'veh_001',
    type: 'oil_change',
    severity: 'low',
    title: 'Troca de Óleo em Breve',
    description: 'Seu veículo terá troca de óleo em aproximadamente 2.000 km.',
    recommendedAction: 'Planejar troca de óleo na próxima visita à concessionária.',
    isRead: true,
    isDismissed: true,
    createdAt: '2024-05-05T08:00:00.000Z',
    expiresAt: '2024-06-05T08:00:00.000Z'
  },
  {
    id: 'alt_007',
    vehicleId: 'veh_003',
    type: 'preventive_review',
    severity: 'moderate',
    title: 'Revisão Periódica',
    description: 'Tempo de revisão periódica de 5.000 km atingido.',
    recommendedAction: 'Agendar revisão preventiva.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-16T15:00:00.000Z',
    expiresAt: '2024-06-01T15:00:00.000Z'
  },
  {
    id: 'alt_008',
    vehicleId: 'veh_006',
    type: 'tire_rotation',
    severity: 'low',
    title: 'Rodízio de Pneus',
    description: 'Rodízio de pneus recomendado aos 32.000 km.',
    recommendedAction: 'Incluir rodízio na próxima manutenção.',
    isRead: false,
    isDismissed: false,
    createdAt: '2024-05-17T09:30:00.000Z',
    expiresAt: '2024-06-01T09:30:00.000Z'
  }
];

const getAlertsBySeverity = () => {
  const severityOrder = { critical: 1, high: 2, moderate: 3, low: 4 };
  return [...mockAlerts].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
  );
};

const DATA_VERSION = 'v1';
const LAST_UPDATE = '2024-05-17T00:00:00.000Z';

module.exports = {
  mockAlerts,
  getAlertsBySeverity,
  DATA_VERSION,
  LAST_UPDATE
};