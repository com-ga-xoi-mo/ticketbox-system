## Why

TicketBox needs a runnable backend foundation before feature teams can safely implement identity, catalog, ticketing, workers, and demo flows. This change creates the platform baseline for Wave 1 so later implementation changes share the same application structure, local services, configuration model, and health verification path.

## What Changes

- Add a NestJS backend skeleton with a maintainable project structure for API modules, shared configuration, infrastructure adapters, and worker code.
- Add Docker Compose services for local PostgreSQL and Redis dependencies used by the backend and worker.
- Add PostgreSQL connection setup that validates connectivity at startup and is ready for later migration/schema changes.
- Add Redis connection setup shared by application code and background processing.
- Add a BullMQ worker skeleton with queue wiring but no domain jobs yet.
- Add config and environment loading with documented local defaults and validation for required variables.
- Add a health check endpoint that reports API liveness plus PostgreSQL and Redis readiness.
- Add a base README describing local setup, environment variables, service startup, and health-check verification for graders and team members.
- Prepare implementation work on branch `feature/implement-platform-foundation`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None.

This change implements foundation behavior already covered by the `project-governance` and `submission-readiness` target specs. It does not change accepted target requirements, so no specs delta is needed.

## Impact

- Affected code: backend application skeleton, configuration modules, database/Redis infrastructure wiring, worker entrypoint, health endpoint, and repository README.
- Affected systems: local Docker Compose runtime, PostgreSQL, Redis, BullMQ worker process, and development/test startup commands.
- Affected dependencies: NestJS framework packages, configuration validation, PostgreSQL client/ORM integration chosen by the implementation, Redis client, BullMQ, and health-check tooling.
- Follow-on changes can build migrations, authentication, domain APIs, and background jobs on this shared foundation.
