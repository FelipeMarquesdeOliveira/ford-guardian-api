# Ford Guardian API

Backend API for Ford Guardian Mobile Application - Sprint Cybersecurity

## Overview

This API provides secure endpoints for the Ford Guardian vehicle monitoring system, implementing comprehensive cybersecurity measures for data protection, authentication, and access control.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, Input Validation
- **Encryption**: AES-256 (crypto-js)
- **Logging**: Winston
- **Testing**: Jest + Supertest

## Security Features

### 1. Input Validation and Sanitization (20 points)
- Strict validation for all user inputs using express-validator
- VIN format validation (17 alphanumeric characters)
- Email normalization and format checking
- Password strength requirements (uppercase, lowercase, number, 6-128 chars)
- Input sanitization against XSS, SQL Injection, and Command Injection
- Request size limiting (10kb max)
- Buffer overflow prevention

### 2. Authentication and Authorization (20 points)
- JWT-based authentication with access and refresh tokens
- Access token expiration: 15 minutes
- Refresh token expiration: 7 days
- Role-Based Access Control (RBAC) with three roles:
  - `admin`: Full access (read, write, delete, update, manage)
  - `analyst`: Read and write access
  - `user`: Read-only access
- Secure password hashing with bcrypt (cost factor 12)

### 3. API Protection (20 points)
- HTTPS/TLS 1.2+ enforcement (configured for production)
- CORS configured with allowed origins only
- Rate limiting:
  - Standard: 100 requests per 15 minutes
  - Auth: 5 attempts per 15 minutes
  - Search: 30 requests per minute
- HMAC payload signature verification
- Request/response integrity validation

### 4. Data Security and Privacy (25 points)
- AES-256 encryption for sensitive data at rest
- Secure data retention policy (90 days default)
- User data anonymization for logs and analytics
- No sensitive data in logs (passwords, tokens redacted)
- Prevention of accidental data exposure

### 5. Monitoring and Auditing (15 points)
- Structured logging with Winston
- Audit trail for all critical actions
- Security event monitoring (failed auth, suspicious activity)
- Request tracing with X-Request-ID
- Error handling without stack trace exposure

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Vehicles
| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|--------|
| GET | `/api/vehicles` | List vehicles | Yes | All |
| GET | `/api/vehicles/:id` | Get vehicle by ID | Yes | All |
| POST | `/api/vehicles` | Create vehicle | Yes | All |
| PUT | `/api/vehicles/:id` | Update vehicle | Yes | All |
| DELETE | `/api/vehicles/:id` | Delete vehicle | Yes | All |
| GET | `/api/vehicles/health-stats` | Health statistics | Yes | Admin, Analyst |

### Alerts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/alerts` | List alerts | Yes |
| GET | `/api/alerts/unread-count` | Get unread count | Yes |
| GET | `/api/alerts/:id` | Get alert by ID | Yes |
| PATCH | `/api/alerts/:id/read` | Mark as read | Yes |
| PATCH | `/api/alerts/:id/dismiss` | Dismiss alert | Yes |

### Dealers
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dealers` | List dealers | Yes |
| GET | `/api/dealers/search` | Search dealers | Yes |
| GET | `/api/dealers/nearby` | Find nearby dealers | Yes |
| GET | `/api/dealers/:id` | Get dealer by ID | Yes |

### Monitoring (Admin only)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/monitoring/status` | Security monitor status | Yes |
| GET | `/api/monitoring/alerts` | Recent security alerts | Yes |
| POST | `/api/monitoring/clear` | Clear old records | Yes |

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
ENCRYPTION_KEY=your_encryption_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:3000
```

## Running the API

```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test
```

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@ford.com | Admin@123 | admin |
| analyst@ford.com | Analyst@123 | analyst |
| felipe@example.com | 123456 | user |
| maria@example.com | Maria@123 | user |

## Project Structure

```
ford-guardian-api/
├── src/
│   ├── controllers/      # Business logic
│   ├── middleware/      # Security & validation
│   ├── routes/          # API routes
│   ├── utils/           # Utilities (logger, encryption)
│   └── index.js         # Application entry
├── mockData/            # Mock data for development
├── tests/               # API tests
├── package.json
└── .env
```

## License

MIT