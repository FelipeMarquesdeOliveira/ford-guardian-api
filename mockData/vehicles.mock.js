const mockVehicles = [
  {
    id: 'veh_001',
    userId: 'usr_003',
    vin: '1HGCM82633A004764',
    brand: 'Ford',
    model: 'Mustang GT',
    year: 2023,
    licensePlate: 'ABC-1234',
    mileage: 15000,
    healthStatus: 'normal',
    lastService: '2024-11-15T00:00:00.000Z',
    nextServiceDue: '2025-05-15T00:00:00.000Z',
    createdAt: '2024-01-10T08:00:00.000Z'
  },
  {
    id: 'veh_002',
    userId: 'usr_003',
    vin: '2FAFP71V86X117563',
    brand: 'Ford',
    model: 'F-150 Lariat',
    year: 2022,
    licensePlate: 'DEF-5678',
    mileage: 45000,
    healthStatus: 'attention',
    lastService: '2024-08-20T00:00:00.000Z',
    nextServiceDue: '2025-02-20T00:00:00.000Z',
    createdAt: '2024-02-15T10:00:00.000Z'
  },
  {
    id: 'veh_003',
    userId: 'usr_004',
    vin: '3FADP40667M103287',
    brand: 'Ford',
    model: 'Bronco Sport',
    year: 2024,
    licensePlate: 'GHI-9012',
    mileage: 5000,
    healthStatus: 'normal',
    lastService: '2024-12-01T00:00:00.000Z',
    nextServiceDue: '2025-06-01T00:00:00.000Z',
    createdAt: '2024-03-20T14:00:00.000Z'
  },
  {
    id: 'veh_004',
    userId: 'usr_004',
    vin: '1FTFW1E84NFA60408',
    brand: 'Ford',
    model: 'Ranger XLT',
    year: 2023,
    licensePlate: 'JKL-3456',
    mileage: 28000,
    healthStatus: 'critical',
    lastService: '2024-06-10T00:00:00.000Z',
    nextServiceDue: '2024-12-10T00:00:00.000Z',
    createdAt: '2024-04-05T09:00:00.000Z'
  },
  {
    id: 'veh_005',
    userId: 'usr_003',
    vin: '5YJSA1E26MF123456',
    brand: 'Ford',
    model: 'Edge SEL',
    year: 2021,
    licensePlate: 'MNO-7890',
    mileage: 62000,
    healthStatus: 'attention',
    lastService: '2024-07-25T00:00:00.000Z',
    nextServiceDue: '2025-01-25T00:00:00.000Z',
    createdAt: '2024-05-12T11:00:00.000Z'
  },
  {
    id: 'veh_006',
    userId: 'usr_005',
    vin: '1G1JC524717101234',
    brand: 'Ford',
    model: 'Fusion Hybrid',
    year: 2022,
    licensePlate: 'PQR-1357',
    mileage: 32000,
    healthStatus: 'normal',
    lastService: '2024-10-30T00:00:00.000Z',
    nextServiceDue: '2025-04-30T00:00:00.000Z',
    createdAt: '2024-06-18T08:30:00.000Z'
  }
];

const getHealthStatusDistribution = () => {
  const distribution = {
    normal: 0,
    attention: 0,
    critical: 0
  };

  mockVehicles.forEach(v => {
    distribution[v.healthStatus]++;
  });

  return distribution;
};

const DATA_VERSION = 'v1';
const LAST_UPDATE = '2024-05-15T00:00:00.000Z';

module.exports = {
  mockVehicles,
  getHealthStatusDistribution,
  DATA_VERSION,
  LAST_UPDATE
};