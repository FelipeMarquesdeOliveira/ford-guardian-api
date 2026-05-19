const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const mockUsers = [
  {
    id: 'usr_001',
    name: 'Admin Ford',
    email: 'admin@ford.com',
    password: 'Admin@123',
    phone: '+5511987654321',
    role: 'admin',
    createdAt: '2024-01-15T08:00:00.000Z',
    lastLogin: null,
    preferences: {
      notifications: true,
      language: 'pt-BR'
    }
  },
  {
    id: 'usr_002',
    name: 'Analista Joao Silva',
    email: 'analyst@ford.com',
    password: 'Analyst@123',
    phone: '+5511987654322',
    role: 'analyst',
    createdAt: '2024-02-20T10:30:00.000Z',
    lastLogin: null,
    preferences: {
      notifications: true,
      language: 'pt-BR'
    }
  },
  {
    id: 'usr_003',
    name: 'Felipe Marques',
    email: 'felipe@example.com',
    password: '123456',
    phone: '+5511987654323',
    role: 'user',
    createdAt: '2024-03-10T14:00:00.000Z',
    lastLogin: null,
    preferences: {
      notifications: true,
      language: 'pt-BR'
    }
  },
  {
    id: 'usr_004',
    name: 'Maria Santos',
    email: 'maria@example.com',
    password: 'Maria@123',
    phone: '+5511987654324',
    role: 'user',
    createdAt: '2024-03-15T09:00:00.000Z',
    lastLogin: null,
    preferences: {
      notifications: false,
      language: 'pt-BR'
    }
  },
  {
    id: 'usr_005',
    name: 'Carlos Oliveira',
    email: 'carlos@ford.com',
    password: 'Carlos@123',
    phone: '+5511987654325',
    role: 'analyst',
    createdAt: '2024-04-01T11:00:00.000Z',
    lastLogin: null,
    preferences: {
      notifications: true,
      language: 'pt-BR'
    }
  }
];

const getHashedUsers = async () => {
  const users = JSON.parse(JSON.stringify(mockUsers));

  for (const user of users) {
    user.password = await hashPassword(user.password);
  }

  return users;
};

const DATA_VERSION = 'v1';
const LAST_UPDATE = '2024-05-15T00:00:00.000Z';

module.exports = {
  getHashedUsers,
  mockUsers,
  DATA_VERSION,
  LAST_UPDATE
};