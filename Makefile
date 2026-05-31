.PHONY: help install dev build lint format test clean docker-up docker-down

help:
	@echo "PhishGuard AI - Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install           Install all dependencies"
	@echo "  make install-backend   Install backend dependencies only"
	@echo "  make install-frontend  Install frontend dependencies only"
	@echo ""
	@echo "Development:"
	@echo "  make dev               Start both frontend and backend"
	@echo "  make dev-backend       Start backend only"
	@echo "  make dev-frontend      Start frontend only"
	@echo ""
	@echo "Building:"
	@echo "  make build             Build both frontend and backend"
	@echo "  make build-backend     Build backend only"
	@echo "  make build-frontend    Build frontend only"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint              Run linting"
	@echo "  make format            Format code with Prettier"
	@echo "  make type-check        Run TypeScript type checking"
	@echo ""
	@echo "Testing:"
	@echo "  make test              Run all tests"
	@echo "  make test-watch        Run tests in watch mode"
	@echo "  make test-cov          Run tests with coverage"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build      Build Docker images"
	@echo "  make docker-up         Start Docker containers"
	@echo "  make docker-down       Stop Docker containers"
	@echo "  make docker-logs       View Docker logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate        Run database migrations"
	@echo "  make db-revert         Revert last migration"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean             Clean all build artifacts"
	@echo "  make clean-deps        Remove node_modules"
	@echo ""

install:
	npm install

install-backend:
	cd backend && npm install && cd ..

install-frontend:
	cd frontend && npm install && cd ..

dev:
	npm run dev

dev-backend:
	npm run dev:backend

dev-frontend:
	npm run dev:frontend

build:
	npm run build

build-backend:
	npm run build:backend

build-frontend:
	npm run build:frontend

lint:
	npm run lint

format:
	npm run format

type-check:
	cd frontend && npm run type-check && cd ..
	cd backend && npm run type-check && cd ..

test:
	npm test

test-watch:
	npm run test:watch

test-cov:
	npm run test:cov

docker-build:
	npm run docker:build

docker-up:
	npm run docker:up

docker-down:
	npm run docker:down

docker-logs:
	npm run docker:logs

db-migrate:
	cd backend && npm run migration:run && cd ..

db-revert:
	cd backend && npm run migration:revert && cd ..

clean:
	rm -rf backend/dist
	rm -rf frontend/.next
	rm -rf coverage

clean-deps:
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf backend/dist
	rm -rf frontend/.next

clean-all: clean clean-deps
	@echo "✅ All cleaned up!"
