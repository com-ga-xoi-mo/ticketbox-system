# TicketBox System

TicketBox is a concert ticketing system for the team project. This foundation change provides the initial NestJS backend workspace, local PostgreSQL and Redis dependencies, BullMQ worker wiring, configuration loading, and health-check path.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop or another Docker Compose compatible runtime

## Setup

```bash
npm install
cp .env.example .env
npm run start:deps
```

The local dependency stack starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Backend API

```bash
npm run dev:api
```

The API listens on `http://localhost:3000` by default.

Health check:

```bash
npm run health
```

Expected healthy response shape:

```json
{
  "status": "up",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "services": {
    "api": { "status": "up" },
    "postgres": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

If PostgreSQL or Redis is unavailable, `GET /health` returns an unhealthy response with the failing dependency status.

## Worker

```bash
npm run dev:worker
```

The worker starts a NestJS application context and registers the placeholder `platform.health` BullMQ processor. Domain jobs are intentionally not implemented in this foundation change.

## Verification

```bash
npm run build
npm run lint
npm run test
npm run format:check
```

Use `npm run verify:workspace` for a lightweight root workspace script check.

## Current Scope Boundaries

This change covers only platform foundation:

- NestJS API and worker skeletons
- shared backend infrastructure modules
- Docker Compose for PostgreSQL and Redis
- Prisma datasource configuration without domain models
- Redis and BullMQ wiring
- environment validation
- health check
- base README

Deferred follow-on changes:

- `implement-database-migrations-and-seed`: schema migrations and seed data
- `implement-auth-rbac`: authentication and authorization
- feature changes for concert catalog, ticketing, payment, notifications, imports, AI bio, and check-in
