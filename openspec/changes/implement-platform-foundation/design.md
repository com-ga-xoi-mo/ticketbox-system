## Context

TicketBox currently has accepted blueprint/spec artifacts but no runnable application code. Member 1 owns the Wave 1 platform foundation change that enables the rest of the team to build against a shared backend runtime, local dependency stack, and README-driven setup flow.

This change implements the foundation portions of the accepted `project-governance` and `submission-readiness` specs. It must create implementation evidence without modifying target specs: target specs remain the accepted contract, while this change's tasks, tests, and later PR will track delivery.

Relevant constraints:

- The accepted architecture is a Node.js/NestJS modular monolith with clean/hexagonal module boundaries.
- PostgreSQL is the transactional source of truth.
- Redis supports queues, cache, rate limiting, idempotency, and circuit breaker state.
- BullMQ workers process async and scheduled work.
- Graders must be able to follow README instructions to start the local system without asking the team.
- This change must not implement domain behavior such as authentication, concert catalog, ticket purchase, migrations, seed data, payment, notification delivery, or check-in flows.

## Goals / Non-Goals

**Goals:**

- Create a runnable NestJS backend API skeleton.
- Establish a repository structure that leaves clear places for backend API, worker, shared backend modules, future frontend apps, docs, and data assets.
- Provide Docker Compose services for PostgreSQL and Redis.
- Add validated environment/config loading for local development and tests.
- Add PostgreSQL and Redis connectivity modules.
- Add a BullMQ worker skeleton with queue infrastructure but no domain processors.
- Add a health endpoint that verifies API liveness and PostgreSQL/Redis readiness.
- Add a base README with setup, environment variables, service startup, and health-check verification.
- Keep the implementation aligned with branch `feature/implement-platform-foundation`.

**Non-Goals:**

- No database schema, migrations, seed data, or sample concerts; those belong to `implement-database-migrations-and-seed`.
- No authentication, RBAC, route guards, or user model.
- No concert, order, payment, notification, import, AI, or check-in domain APIs.
- No customer web, admin web, or React Native check-in app implementation.
- No production deployment, CI pipeline, or cloud infrastructure.
- No specs delta unless implementation reveals that accepted target behavior must change.

## Decisions

### Decision 1: Use a lightweight monorepo structure with separate API and worker apps

Create the foundation around this layout:

```text
apps/
  api/
  worker/
packages/
  backend/
docs/
openspec/
```

`apps/api` contains the NestJS HTTP entrypoint. `apps/worker` contains a separate NestJS application context for BullMQ processors. `packages/backend` contains shared backend modules such as config, database, redis, queue, health support, and later domain boundaries. Future customer/admin/mobile apps can be added under `apps/` without changing the backend baseline.

Rationale:

- The accepted blueprint calls for one modular monolith backend but separate worker runtime behavior.
- Keeping API and worker entrypoints separate makes local startup and later deployment/demo commands explicit.
- Shared backend code can be imported by both runtimes without duplicating infrastructure modules.

Alternative considered: a single NestJS app that starts HTTP and workers together. This is simpler at first, but it makes worker-only startup, retries, and future scaling harder to demonstrate.

### Decision 2: Use NestJS modules with clean boundary placeholders

The foundation should define module-level boundaries but avoid premature domain code. Initial shared modules should include:

- `ConfigModule`: environment loading and validation.
- `DatabaseModule`: PostgreSQL adapter and health check.
- `RedisModule`: Redis client provider and health check.
- `QueueModule`: BullMQ connection and placeholder queue registration.
- `HealthModule`: HTTP health endpoint.

Domain folders can be created as placeholders only when needed by a concrete feature change. The foundation should avoid empty controllers/services for future business capabilities because those create false implementation evidence.

Rationale:

- NestJS modules match the accepted modular monolith architecture.
- Infrastructure modules are genuinely required by this scope.
- Avoiding empty feature modules keeps later implementation changes reviewable and accountable.

Alternative considered: scaffold all bounded contexts immediately. This would make the tree look complete but would add noise without tests or behavior.

### Decision 3: Use Prisma as the PostgreSQL adapter and migration path

Use Prisma for the initial PostgreSQL connection and as the expected migration/seed tool for the follow-on database change. The foundation can include a datasource/generator configuration and a `PrismaService` that validates connectivity with a simple query. Domain repositories added later must hide Prisma behind adapters so application/domain layers do not import Prisma types directly unless a feature explicitly accepts that trade-off.

Rationale:

- Prisma gives the team a straightforward migration and seed workflow for Week 1.
- A NestJS `PrismaService` is small and easy to health-check.
- Raw SQL can still be used for critical row-level locking in ticket reservation when needed.

Alternative considered: TypeORM. TypeORM has mature NestJS integration and lock APIs, but it encourages entity classes to spread through the codebase and adds more boilerplate for this project. Alternative considered: raw `pg`. Raw SQL maximizes control but slows the team for schema, migrations, and seed work.

### Decision 4: Use `ioredis` and BullMQ with a shared Redis config

Use `ioredis` as the Redis client and BullMQ for queue/worker plumbing. API and worker runtimes should consume the same validated Redis environment variables. The foundation should register a placeholder queue such as `platform.health` or `default` only to prove wiring; no domain jobs should be added yet.

Rationale:

- BullMQ uses Redis, matching the accepted blueprint.
- `ioredis` is a common BullMQ-compatible Redis client.
- A shared Redis module prevents duplicate connection configuration across cache, rate limiting, queues, and future resilience features.

Alternative considered: Nest schedule-only jobs. That is useful for simple cron behavior but does not provide durable retries, delayed jobs, or queue introspection for the later async integration scope.

### Decision 5: Validate configuration at startup and document local defaults

Use a typed environment configuration module with startup validation for required values:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` when configured
- queue prefix or namespace

Provide `.env.example` and README instructions. Local Compose defaults should work without secrets. Tests should be able to override env values explicitly.

Rationale:

- Missing config should fail fast instead of producing partial runtime behavior.
- Grader setup depends on clear, reproducible environment instructions.

Alternative considered: relying on process env directly inside modules. This is faster to write but makes misconfiguration harder to diagnose and harder to test.

### Decision 6: Health endpoint reports liveness and dependency readiness

Expose an API health endpoint, for example `GET /health`, that returns:

- API liveness/status.
- PostgreSQL readiness via a simple database query.
- Redis readiness via `PING`.

The endpoint should return success only when required dependencies are reachable. If a dependency is unavailable, it should return an unhealthy response with enough detail for local troubleshooting but without leaking secrets.

Rationale:

- This directly supports submission readiness and local grader verification.
- Later features can add queue, storage, and provider checks without changing the baseline contract.

Alternative considered: a static liveness endpoint only. That would prove the HTTP server is up but not that the required platform dependencies are usable.

### Decision 7: Keep Docker Compose focused on local dependencies in this change

This change should provide Compose services for PostgreSQL and Redis and may add named volumes and health checks for both. Running the API/worker inside Compose is optional for the foundation; the README should at minimum document local dependency startup with Compose and app startup with package scripts.

Rationale:

- The immediate blocker for all team members is consistent local dependencies.
- Keeping app startup in package scripts improves development speed while the project is still being scaffolded.

Alternative considered: full Compose orchestration for API, worker, frontend apps, mail server, and object storage. That belongs to later readiness/hardening work after the apps exist.

## Risks / Trade-offs

- Prisma schema is initially thin or empty -> The follow-on migration/seed change must add the real model schema and first migration before domain features depend on persistence.
- Separate API and worker apps add some package-script complexity -> Keep scripts explicit (`dev:api`, `dev:worker`, `start:deps`) and document the normal startup path in README.
- Health checks can become noisy if local dependencies are not started -> README must tell developers to start Compose dependencies before the API.
- Docker Compose may drift from README commands -> Add a verification task to run the documented setup path before closing the change.
- Foundation may accidentally include domain placeholders that imply completion -> Restrict code changes to infrastructure modules, runtime skeletons, and documentation.

## Migration Plan

1. Create or switch to branch `feature/implement-platform-foundation`.
2. Add package/workspace configuration and install foundation dependencies.
3. Add API and worker NestJS entrypoints plus shared backend infrastructure modules.
4. Add Docker Compose and environment example files.
5. Add health endpoint and dependency checks.
6. Add README setup instructions.
7. Verify the documented local startup path and health endpoint.

Rollback is straightforward because this change introduces new foundation files without migrating existing application data. Reverting the branch removes the scaffold.

## Open Questions

- None blocking. If implementation reveals package-manager, Prisma, or Compose constraints that conflict with the accepted blueprint, update this change before coding further and add a specs/design delta only if target behavior changes.
