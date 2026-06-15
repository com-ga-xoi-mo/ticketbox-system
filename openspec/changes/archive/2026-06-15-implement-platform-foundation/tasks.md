## 1. Branch and Workspace Setup

- [x] 1.1 Create or switch to branch `feature/implement-platform-foundation`.
- [x] 1.2 Add root package/workspace configuration for the backend foundation.
- [x] 1.3 Add TypeScript, linting, formatting, and test configuration needed by the NestJS API and worker apps.
- [x] 1.4 Add package scripts for dependency startup, API development, worker development, build, lint, test, and health verification.

## 2. Project Structure

- [x] 2.1 Create `apps/api` as the NestJS HTTP application entrypoint.
- [x] 2.2 Create `apps/worker` as the NestJS worker application entrypoint.
- [x] 2.3 Create `packages/backend` for shared backend modules used by both API and worker runtimes.
- [x] 2.4 Add only infrastructure module placeholders required by this scope; avoid domain feature placeholders.
- [x] 2.5 Ensure imports and TypeScript path aliases support shared backend modules without circular dependencies.

## 3. Docker Compose and Environment

- [x] 3.1 Add Docker Compose configuration for local PostgreSQL and Redis services.
- [x] 3.2 Add named volumes and service health checks for PostgreSQL and Redis.
- [x] 3.3 Add `.env.example` with local defaults for API port, PostgreSQL connection, Redis connection, and queue namespace.
- [x] 3.4 Implement validated environment loading for required config values.
- [x] 3.5 Ensure missing or invalid environment values fail startup with actionable errors.

## 4. PostgreSQL Foundation

- [x] 4.1 Add Prisma datasource/generator configuration for PostgreSQL without adding domain schema models.
- [x] 4.2 Implement a shared database module and `PrismaService` provider.
- [x] 4.3 Add database lifecycle handling for connect and disconnect.
- [x] 4.4 Add a database readiness check that executes a simple PostgreSQL query.
- [x] 4.5 Document that real schema migrations and seed data are deferred to `implement-database-migrations-and-seed`.

## 5. Redis and Queue Foundation

- [x] 5.1 Implement a shared Redis module using the validated Redis config.
- [x] 5.2 Add Redis lifecycle handling for connect, ping, and shutdown.
- [x] 5.3 Add a Redis readiness check based on `PING`.
- [x] 5.4 Configure BullMQ with the shared Redis connection settings.
- [x] 5.5 Add a worker skeleton that boots successfully and registers a placeholder queue or processor without domain jobs.

## 6. Health Check

- [x] 6.1 Add `GET /health` to the API app.
- [x] 6.2 Return API liveness plus PostgreSQL and Redis readiness status.
- [x] 6.3 Return an unhealthy response when PostgreSQL or Redis is unavailable.
- [x] 6.4 Keep health response details useful for local troubleshooting without exposing secrets.
- [x] 6.5 Add focused tests for healthy and dependency-unhealthy health responses.

## 7. README and Submission Readiness

- [x] 7.1 Add a base README with prerequisites, environment setup, and dependency startup instructions.
- [x] 7.2 Document API and worker startup commands.
- [x] 7.3 Document the health-check URL and expected healthy response.
- [x] 7.4 Document the current scope boundaries and link follow-on changes for migrations, seed data, auth, and domain features.
- [x] 7.5 Ensure README instructions are sufficient for a grader or teammate to run the foundation locally.

## 8. Verification

- [x] 8.1 Run install/build/lint/test commands documented for the foundation.
- [x] 8.2 Start PostgreSQL and Redis with Docker Compose and verify both services become healthy.
- [x] 8.3 Start the API and verify `GET /health` reports API, PostgreSQL, and Redis as healthy.
- [x] 8.4 Start the worker and verify it connects to Redis without processing domain jobs.
- [x] 8.5 Stop one dependency and verify the health endpoint reports the expected unhealthy status.
- [x] 8.6 Update this task checklist with completed items and note any deferred work before review.
