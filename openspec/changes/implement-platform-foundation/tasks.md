## 1. Branch and Workspace Setup

- [x] 1.1 Create or switch to branch `feature/implement-platform-foundation`.
- [x] 1.2 Add root package/workspace configuration for the backend foundation.
- [x] 1.3 Add TypeScript, linting, formatting, and test configuration needed by the NestJS API and worker apps.
- [x] 1.4 Add package scripts for dependency startup, API development, worker development, build, lint, test, and health verification.

## 2. Project Structure

- [ ] 2.1 Create `apps/api` as the NestJS HTTP application entrypoint.
- [ ] 2.2 Create `apps/worker` as the NestJS worker application entrypoint.
- [ ] 2.3 Create `packages/backend` for shared backend modules used by both API and worker runtimes.
- [ ] 2.4 Add only infrastructure module placeholders required by this scope; avoid domain feature placeholders.
- [ ] 2.5 Ensure imports and TypeScript path aliases support shared backend modules without circular dependencies.

## 3. Docker Compose and Environment

- [ ] 3.1 Add Docker Compose configuration for local PostgreSQL and Redis services.
- [ ] 3.2 Add named volumes and service health checks for PostgreSQL and Redis.
- [ ] 3.3 Add `.env.example` with local defaults for API port, PostgreSQL connection, Redis connection, and queue namespace.
- [ ] 3.4 Implement validated environment loading for required config values.
- [ ] 3.5 Ensure missing or invalid environment values fail startup with actionable errors.

## 4. PostgreSQL Foundation

- [ ] 4.1 Add Prisma datasource/generator configuration for PostgreSQL without adding domain schema models.
- [ ] 4.2 Implement a shared database module and `PrismaService` provider.
- [ ] 4.3 Add database lifecycle handling for connect and disconnect.
- [ ] 4.4 Add a database readiness check that executes a simple PostgreSQL query.
- [ ] 4.5 Document that real schema migrations and seed data are deferred to `implement-database-migrations-and-seed`.

## 5. Redis and Queue Foundation

- [ ] 5.1 Implement a shared Redis module using the validated Redis config.
- [ ] 5.2 Add Redis lifecycle handling for connect, ping, and shutdown.
- [ ] 5.3 Add a Redis readiness check based on `PING`.
- [ ] 5.4 Configure BullMQ with the shared Redis connection settings.
- [ ] 5.5 Add a worker skeleton that boots successfully and registers a placeholder queue or processor without domain jobs.

## 6. Health Check

- [ ] 6.1 Add `GET /health` to the API app.
- [ ] 6.2 Return API liveness plus PostgreSQL and Redis readiness status.
- [ ] 6.3 Return an unhealthy response when PostgreSQL or Redis is unavailable.
- [ ] 6.4 Keep health response details useful for local troubleshooting without exposing secrets.
- [ ] 6.5 Add focused tests for healthy and dependency-unhealthy health responses.

## 7. README and Submission Readiness

- [ ] 7.1 Add a base README with prerequisites, environment setup, and dependency startup instructions.
- [ ] 7.2 Document API and worker startup commands.
- [ ] 7.3 Document the health-check URL and expected healthy response.
- [ ] 7.4 Document the current scope boundaries and link follow-on changes for migrations, seed data, auth, and domain features.
- [ ] 7.5 Ensure README instructions are sufficient for a grader or teammate to run the foundation locally.

## 8. Verification

- [ ] 8.1 Run install/build/lint/test commands documented for the foundation.
- [ ] 8.2 Start PostgreSQL and Redis with Docker Compose and verify both services become healthy.
- [ ] 8.3 Start the API and verify `GET /health` reports API, PostgreSQL, and Redis as healthy.
- [ ] 8.4 Start the worker and verify it connects to Redis without processing domain jobs.
- [ ] 8.5 Stop one dependency and verify the health endpoint reports the expected unhealthy status.
- [ ] 8.6 Update this task checklist with completed items and note any deferred work before review.
