# PhishGuard AI - Phishing Simulation Platform

> Advanced phishing simulation and awareness training platform with Next.js frontend and NestJS backend

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20+-green)
![Next.js](https://img.shields.io/badge/Next.js-14+-blue)
![NestJS](https://img.shields.io/badge/NestJS-10+-red)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Docker Deployment](#docker-deployment)
- [Database Migrations](#database-migrations)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

PhishGuard AI is a comprehensive phishing simulation platform designed to:

- **Simulate realistic phishing attacks** with customizable templates
- **Track employee engagement** and click-through rates
- **Provide security awareness training** with detailed analytics
- **Generate compliance reports** for security audits
- **Automate campaign management** with scheduled simulations
- **Real-time notifications** and monitoring dashboards

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHISHGUARD AI SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      FRONTEND (Next.js 14)              │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  Pages: Dashboard, Campaigns, Reports, Settings │   │    │
│  │  │  Components: UI, Forms, Charts, Tables           │   │    │
│  │  │  State: Zustand (Auth, UI State)                 │   │    │
│  │  │  Data: React Query (TanStack Query)              │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↕                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  NGINX (Reverse Proxy)                  │    │
│  │  • Static file serving                                  │    │
│  │  • API request routing                                  │    │
│  │  • Load balancing                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↕                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 BACKEND (NestJS + Express)              │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  Controllers: Auth, Users, Campaigns, Reports    │   │    │
│  │  │  Services: Business logic layer                  │   │    │
│  │  │  Modules: Feature modules (Auth, Campaigns)      │   │    │
│  │  │  Middleware: CORS, Logger, Error Handler         │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  • JWT Authentication (Passport)                       │    │
│  │  • Swagger API Documentation                           │    │
│  │  • Bull Job Queue for async tasks                       │    │
│  │  • Bull Dashboard for job monitoring                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↕                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    DATA LAYER                           │    │
│  │  ┌──────────────┐    ┌──────────────┐                  │    │
│  │  │ PostgreSQL   │    │   Redis      │                  │    │
│  │  │   Database   │    │   Cache/Q    │                  │    │
│  │  │  • TypeORM   │    │  • Sessions  │                  │    │
│  │  │  • Entities  │    │  • Jobs      │                  │    │
│  │  │  • Relations │    │  • Pub/Sub   │                  │    │
│  │  └──────────────┘    └──────────────┘                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               EXTERNAL SERVICES                         │    │
│  │  ┌──────────────┐  ┌──────────────┐                    │    │
│  │  │  Nodemailer  │  │  SMTP Server │                    │    │
│  │  │  (Email)     │  │  (Gmail)     │                    │    │
│  │  └──────────────┘  └──────────────┘                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
phishguard-ai/
├── frontend/                          # Next.js Frontend Application
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities (API client, helpers)
│   │   ├── store/                   # Zustand state management
│   │   ├── styles/                  # Global CSS and Tailwind
│   │   └── types/                   # TypeScript type definitions
│   ├── public/                      # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── next.config.js
│   ├── .eslintrc.json
│   └── .env.example
│
├── backend/                           # NestJS Backend Application
│   ├── src/
│   │   ├── main.ts                  # Application entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── modules/
│   │   │   ├── health/              # Health check module
│   │   │   ├── auth/                # Authentication module
│   │   │   ├── users/               # User management module
│   │   │   ├── campaigns/           # Phishing campaigns module
│   │   │   ├── reports/             # Analytics & reports module
│   │   │   └── email/               # Email service module
│   │   ├── common/
│   │   │   ├── base.entity.ts       # Base entity class
│   │   │   ├── decorators/          # Custom decorators
│   │   │   ├── filters/             # Exception filters
│   │   │   ├── guards/              # Auth guards
│   │   │   └── interceptors/        # Response interceptors
│   │   ├── database/
│   │   │   ├── migrations/          # Database migrations
│   │   │   └── seeders/             # Data seeders
│   │   ├── config/                  # Configuration files
│   │   └── utils/                   # Utility functions
│   ├── test/                        # Test files
│   ├── dist/                        # Compiled output
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   └── .env.example
│
├── docker/                            # Docker Configuration
│   ├── docker-compose.yml           # Docker Compose configuration
│   ├── Dockerfile.backend           # Backend Docker image
│   ├── Dockerfile.frontend          # Frontend Docker image
│   └── nginx.conf                   # Nginx reverse proxy config
│
├── package.json                      # Root monorepo package.json
├── tsconfig.json                     # Root TypeScript config
├── .prettierrc                       # Code formatting rules
├── .gitignore
└── README.md                         # This file
```

## 💻 Tech Stack

### Frontend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Next.js** | React framework with App Router | 14.x |
| **TypeScript** | Type-safe JavaScript | 5.3.x |
| **Tailwind CSS** | Utility-first CSS framework | 3.4.x |
| **ShadCN/UI** | React component library | 0.8.x |
| **Zustand** | State management | 4.5.x |
| **React Hook Form** | Form state management | 7.5.x |
| **Zod** | TypeScript schema validation | 3.2.x |
| **TanStack Query** | Server state management | 5.3.x |
| **Recharts** | React charting library | 2.11.x |
| **Axios** | HTTP client | 1.6.x |
| **Sonner** | Toast notifications | 1.3.x |

### Backend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **NestJS** | Node.js framework | 10.3.x |
| **TypeScript** | Type-safe JavaScript | 5.3.x |
| **TypeORM** | ORM for database | 0.3.x |
| **PostgreSQL** | Relational database | 15.x |
| **Redis** | In-memory data store | 7.x |
| **Bull** | Job queue library | 4.11.x |
| **Passport** | Authentication middleware | 0.7.x |
| **JWT** | Token-based auth | 11.0.x |
| **Nodemailer** | Email sending | 6.9.x |
| **Swagger** | API documentation | 7.1.x |
| **class-validator** | Schema validation | 0.14.x |

### DevOps

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Docker** | Containerization | Latest |
| **Docker Compose** | Multi-container orchestration | 3.8 |
| **Nginx** | Reverse proxy | Alpine latest |
| **Node.js** | Runtime environment | 20.x |

## 📦 Prerequisites

### System Requirements

- **Node.js**: v20.10.6 or higher
- **npm**: v10.x or higher
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **Git**: Latest version

### Optional

- **PostgreSQL 15**: For local development without Docker
- **Redis 7**: For local development without Docker
- **VS Code**: Recommended editor

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/phishguard-ai.git
cd phishguard-ai
```

### 2. Install Dependencies

Using npm workspaces (monorepo):

```bash
npm install
```

Or install individually:

```bash
# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 3. Setup Environment Variables

```bash
# Copy example files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Or run the setup script (Unix/Mac)
bash .env.setup.sh
```

## ⚙️ Configuration

### Frontend Environment (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_AUTH_DOMAIN=phishguard.local
NEXT_PUBLIC_JWT_EXPIRY=7d
```

### Backend Environment (`.env`)

```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=phishguard
DB_PASSWORD=changeme123
DB_NAME=phishguard_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@phishguard.ai

# API
API_URL=http://localhost:3001
API_CORS_ORIGIN=http://localhost:3000
```

## 🏃 Running Locally

### Without Docker

#### Terminal 1: Backend

```bash
# Install dependencies
cd backend
npm install

# Run database migrations
npm run migration:run

# Start development server
npm run dev

# Server runs on http://localhost:3001
```

#### Terminal 2: Frontend

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# App runs on http://localhost:3000
```

#### Prerequisites for Local Development

- PostgreSQL 15 running on localhost:5432
- Redis 7 running on localhost:6379

### With Docker

#### Start All Services

```bash
# Build and start containers
npm run docker:up

# Or manually
docker-compose -f docker/docker-compose.yml up -d
```

#### View Logs

```bash
npm run docker:logs

# Or specific service
docker-compose -f docker/docker-compose.yml logs -f backend
```

#### Stop Services

```bash
npm run docker:down

# Or manually
docker-compose -f docker/docker-compose.yml down
```

#### Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Swagger Docs**: http://localhost:3001/swagger
- **Bull Dashboard**: http://localhost:3001/bull
- **Nginx**: http://localhost

## 🗄️ Database Migrations

### Generate Migration

```bash
cd backend
npm run migration:generate -- -n MigrationName
```

### Run Migrations

```bash
cd backend
npm run migration:run
```

### Revert Migration

```bash
cd backend
npm run migration:revert
```

### Create Entity Example

```typescript
// src/modules/users/user.entity.ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: false })
  isActive: boolean;
}
```

## 📚 API Documentation

### Swagger UI

Access interactive API documentation at:

```
http://localhost:3001/swagger
```

### API Endpoints Structure

```
/api/v1/
├── /health                          # Health check
├── /auth
│   ├── POST   /login               # User login
│   ├── POST   /register            # User registration
│   ├── POST   /refresh             # Refresh JWT token
│   └── POST   /logout              # User logout
├── /users
│   ├── GET    /                    # List users
│   ├── GET    /:id                 # Get user by ID
│   ├── POST   /                    # Create user
│   ├── PATCH  /:id                 # Update user
│   └── DELETE /:id                 # Delete user
├── /campaigns
│   ├── GET    /                    # List campaigns
│   ├── GET    /:id                 # Get campaign details
│   ├── POST   /                    # Create campaign
│   ├── PATCH  /:id                 # Update campaign
│   └── DELETE /:id                 # Delete campaign
└── /reports
    ├── GET    /campaigns/:id       # Campaign report
    ├── GET    /summary             # Summary report
    └── GET    /export              # Export report
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

### Building

```bash
# Build both frontend and backend
npm run build

# Build individual packages
npm run build:frontend
npm run build:backend
```

### Development Scripts (Root)

```bash
# Development
npm run dev                # Run both frontend and backend
npm run dev:backend        # Backend only
npm run dev:frontend       # Frontend only

# Production
npm run build              # Build both
npm run lint               # Lint both
npm run format             # Format both
npm run test               # Test both

# Docker
npm run docker:build       # Build images
npm run docker:up          # Start services
npm run docker:down        # Stop services
npm run docker:logs        # View logs
```

## 🐳 Docker Deployment

### Build Custom Images

```bash
# Build all services
docker-compose -f docker/docker-compose.yml build

# Build specific service
docker-compose -f docker/docker-compose.yml build backend
```

### Production Deployment

For production deployments:

1. Update `docker-compose.yml` with production environment variables
2. Configure SSL/TLS certificates for Nginx
3. Set up proper database backups
4. Configure monitoring and logging
5. Use environment-specific `.env` files

### Docker Health Checks

All services include health checks:

- **Backend**: Checks `/api/health` endpoint
- **PostgreSQL**: Checks database connectivity
- **Redis**: Checks Redis ping command
- **Frontend**: Checks port connectivity

## 🧹 Cleanup

### Remove All Docker Resources

```bash
# Stop and remove containers
docker-compose -f docker/docker-compose.yml down -v

# Remove images
docker rmi phishguard-ai-backend phishguard-ai-frontend
```

### Clean Build Artifacts

```bash
# Remove all node_modules
rm -rf node_modules frontend/node_modules backend/node_modules

# Remove compiled code
rm -rf backend/dist frontend/.next
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on specific port (Mac/Linux)
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Issues

```bash
# Check PostgreSQL connection
psql -h localhost -U phishguard -d phishguard_db

# Check Redis connection
redis-cli -h localhost -p 6379 ping
```

### Docker Issues

```bash
# View detailed logs
docker-compose -f docker/docker-compose.yml logs backend

# Rebuild without cache
docker-compose -f docker/docker-compose.yml build --no-cache

# Remove and recreate volumes
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up
```

### CORS Errors

Update `backend/.env`:

```env
API_CORS_ORIGIN=http://localhost:3000
```

Or in `src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
});
```

### TypeScript Errors

```bash
# Check types
npm run type-check

# Rebuild cache
rm -rf node_modules/.cache
npm install
```

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Docker Documentation](https://docs.docker.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For support, email support@phishguard.ai or open an issue on GitHub.

---

**Last Updated**: May 2026  
**Version**: 1.0.0  
**Status**: Active Development
