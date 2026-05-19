const mockDealers = [
  {
    id: 'dlr_001',
    name: 'Ford Plaza Alphaville',
    address: 'Av. Marginal, 1200',
    city: 'Barueri',
    state: 'SP',
    phone: '+5511987654321',
    distance: 5.2,
    rating: 4.8,
    reviewCount: 342,
    services: ['manutencao', 'revisao', 'sos', 'pecas'],
    openingHours: {
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
      wednesday: '08:00-18:00',
      thursday: '08:00-18:00',
      friday: '08:00-18:00',
      saturday: '08:00-12:00',
      sunday: 'closed'
    },
    coordinates: {
      lat: -23.0123,
      lng: -47.0132
    }
  },
  {
    id: 'dlr_002',
    name: 'Ford Santana',
    address: 'Av. Consolação, 3500',
    city: 'São Paulo',
    state: 'SP',
    phone: '+5511987654322',
    distance: 12.7,
    rating: 4.5,
    reviewCount: 518,
    services: ['manutencao', 'revisao', 'pecas'],
    openingHours: {
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
      wednesday: '08:00-18:00',
      thursday: '08:00-18:00',
      friday: '08:00-18:00',
      saturday: '09:00-14:00',
      sunday: 'closed'
    },
    coordinates: {
      lat: -23.0234,
      lng: -46.0234
    }
  },
  {
    id: 'dlr_003',
    name: 'Ford Interlagos',
    address: 'Rua das Pipas, 890',
    city: 'São Paulo',
    state: 'SP',
    phone: '+5511987654323',
    distance: 18.3,
    rating: 4.6,
    reviewCount: 276,
    services: ['manutencao', 'revisao', 'sos', 'pecas', 'body_shop'],
    openingHours: {
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
      wednesday: '08:00-18:00',
      thursday: '08:00-18:00',
      friday: '08:00-18:00',
      saturday: '08:00-12:00',
      sunday: 'closed'
    },
    coordinates: {
      lat: -23.0345,
      lng: -46.0345
    }
  },
  {
    id: 'dlr_004',
    name: 'Ford Campinas',
    address: 'Av. Brasil, 450',
    city: 'Campinas',
    state: 'SP',
    phone: '+5511987654324',
    distance: 95.4,
    rating: 4.7,
    reviewCount: 189,
    services: ['manutencao', 'revisao', 'pecas'],
    openingHours: {
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
      wednesday: '08:00-18:00',
      thursday: '08:00-18:00',
      friday: '08:00-18:00',
      saturday: '08:00-12:00',
      sunday: 'closed'
    },
    coordinates: {
      lat: -23.0456,
      lng: -46.0456
    }
  },
  {
    id: 'dlr_005',
    name: 'Ford Santos',
    address: 'Av. da Liberdade, 100',
    city: 'Santos',
    state: 'SP',
    phone: '+5511987654325',
    distance: 72.1,
    rating: 4.4,
    reviewCount: 156,
    services: ['manutencao', 'revisao', 'sos'],
    openingHours: {
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
      wednesday: '08:00-18:00',
      thursday: '08:00-18:00',
      friday: '08:00-18:00',
      saturday: '09:00-13:00',
      sunday: 'closed'
    },
    coordinates: {
      lat: -23.0567,
      lng: -46.0567
    }
  }
];

const searchDealersByCity = (city) => {
  return mockDealers.filter(d =>
    d.city.toLowerCase().includes(city.toLowerCase())
  );
};

const DATA_VERSION = 'v1';
const LAST_UPDATE = '2024-05-15T00:00:00.000Z';

module.exports = {
  mockDealers,
  searchDealersByCity,
  DATA_VERSION,
  LAST_UPDATE
};