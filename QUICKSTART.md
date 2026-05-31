# Getting Started with PhishGuard AI

## Quick Start (5 minutes)

### Using Docker (Recommended)

```bash
# 1. Clone and enter directory
git clone <repo-url>
cd phishguard-ai

# 2. Copy environment files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Start all services
npm run docker:up

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api
# Swagger Docs: http://localhost:3001/swagger
# Nginx: http://localhost
```

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Update backend/.env with local database credentials
# DB_HOST=localhost
# REDIS_HOST=localhost

# 4. Start services (separate terminals)

# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend

# 5. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001/api
```

## Common Tasks

### Using Make (Unix/Mac)

```bash
make help              # Show all available commands
make install          # Install dependencies
make dev              # Start development servers
make build            # Build for production
make lint             # Run linting
make format           # Format code
make docker-up        # Start Docker services
make docker-down      # Stop Docker services
```

### Using npm Scripts (All Platforms)

```bash
npm run dev            # Start both frontend and backend
npm run build          # Build both packages
npm run lint           # Lint both packages
npm run format         # Format both packages
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
```

## Project Structure Quick Reference

```
phishguard-ai/
├── frontend/          # Next.js frontend
│   ├── app/          # App Router pages
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── types/
├── backend/          # NestJS backend
│   └── src/
│       ├── main.ts
│       ├── modules/
│       └── database/
└── docker/           # Docker configuration
```

## Important Files to Know

| File | Purpose |
|------|---------|
| `package.json` | Monorepo root config |
| `frontend/.env.local` | Frontend environment variables |
| `backend/.env` | Backend environment variables |
| `docker-compose.yml` | Docker services config |
| `docker/nginx.conf` | Nginx reverse proxy config |
| `README.md` | Full documentation |
| `DEVELOPMENT.md` | Development guidelines |

## Database Setup

### With Docker (Automatic)

Database runs automatically when you start Docker services.

### Local Development

```bash
# 1. Install PostgreSQL 15
# 2. Create database and user:
createdb -U postgres phishguard_db
createuser phishguard -P  # Enter password: changeme123

# 3. Run migrations
cd backend
npm run migration:run

# 4. Test connection
psql -h localhost -U phishguard -d phishguard_db
```

## Troubleshooting

### Port Already in Use

```bash
# Mac/Linux - Kill process on port
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows - Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker Issues

```bash
# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Rebuild containers
docker-compose -f docker/docker-compose.yml build --no-cache

# Complete reset
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
psql -h localhost -U phishguard -d phishguard_db

# Check Redis is running
redis-cli ping

# Verify .env files have correct credentials
cat backend/.env | grep DB_
cat backend/.env | grep REDIS_
```

## Next Steps

1. **Explore the API**
   - Open http://localhost:3001/swagger
   - Browse available endpoints
   - Try out API calls

2. **Login to Frontend**
   - Go to http://localhost:3000
   - Create a test account (if auth is implemented)

3. **Read Documentation**
   - Full docs: [README.md](./README.md)
   - Development guide: [DEVELOPMENT.md](./DEVELOPMENT.md)
   - Backend: [backend/README.md](./backend/README.md) (create if needed)
   - Frontend: [frontend/README.md](./frontend/README.md) (create if needed)

4. **Make Your First Change**
   - Create a new branch: `git checkout -b feature/my-feature`
   - Make changes to frontend or backend
   - Test locally
   - Submit a pull request

## Getting Help

- Check [README.md](./README.md) for detailed documentation
- Review [DEVELOPMENT.md](./DEVELOPMENT.md) for guidelines
- Check Docker logs: `npm run docker:logs`
- Inspect backend: http://localhost:3001/swagger
- Check browser console for frontend errors

---

**Happy coding!** 🚀
