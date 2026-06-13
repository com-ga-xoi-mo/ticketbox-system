## Why

TicketBox needs a precise blueprint before implementation because the project combines high-traffic ticket sales, payment reliability, offline check-in, admin operations, AI document processing, and one-way CSV integration. The blueprint must turn the course requirements into a 5-week production-like plan that the team can implement without drifting into unrelated CRUD work or unprovable architecture claims.

## What Changes

- Define the end-to-end TicketBox system blueprint for a 5-week team project.
- Specify the functional scope for customer ticket purchase, organizer administration, check-in staff workflows, notifications, AI artist bio generation, and VIP guest list import.
- Specify the technical mechanisms required by the assignment: concurrency-safe inventory reservation, per-user ticket limits, rate limiting, payment circuit breaker, idempotency, caching, offline check-in sync, and CSV import resilience.
- Establish a production-like but feasible architecture using a modular monolith backend, clean/hexagonal module boundaries, PostgreSQL, Redis, background workers, object storage, customer web, admin web, and check-in PWA/mobile web.
- Define C4 diagrams, high-level architecture, database model, access control model, business flows, acceptance criteria, and implementation tasks.
- Document explicit trade-offs and non-goals so the 5-week scope remains realistic while still satisfying all required features.
- No breaking changes are introduced because this is the initial system blueprint and no official OpenSpec specs exist yet.

## Capabilities

### New Capabilities

- `identity-access`: Authentication, role-based access control, user roles, admin access, organizer permissions, and check-in staff authorization.
- `concert-management`: Organizer concert creation, update, cancellation, ticket type configuration, sale windows, seating map assets, and public concert browsing.
- `ticket-purchase`: Customer ticket selection, order lifecycle, inventory reservation, per-user limits, QR e-ticket issuance, and oversell prevention.
- `payment-reliability`: Payment gateway abstraction, VNPAY/MoMo simulator behavior, callback handling, idempotency, timeout handling, reconciliation, and circuit breaker behavior.
- `notification-delivery`: In-app and email confirmation, 24-hour concert reminder jobs, and channel extensibility for future SMS/Zalo OA integrations.
- `checkin-offline-sync`: QR validation, online check-in, offline scan queue, sync retry, duplicate prevention, and conflict handling for weak network venues.
- `guest-list-import`: Scheduled CSV import for sponsor VIP guest lists, validation, duplicate handling, idempotent import, import reports, and VIP gate lookup.
- `ai-artist-bio`: PDF press kit upload, text extraction, cleanup, AI adapter invocation, generated artist bio review, and publication on concert detail pages.
- `platform-protection`: Rate limiting, bot/flood mitigation, Redis caching, cache invalidation, graceful degradation, observability, and load-test expectations.
- `submission-readiness`: README, seed data, local Docker runtime, demo scenarios, test evidence, and final blueprint packaging for course submission.

### Modified Capabilities

- None. This change defines the initial TicketBox capabilities.

## Impact

- Creates the OpenSpec planning source for the project under `openspec/changes/define-ticketbox-blueprint`.
- Defines future implementation boundaries for backend modules, frontend applications, check-in app/PWA, database schema, Redis usage, worker jobs, payment simulator, AI adapter, and CSV importer.
- Establishes the blueprint content that can later be exported into the course-required `blueprint/` folder or PDF.
- Guides future implementation changes such as `implement-platform-foundation`, `implement-concert-management`, `implement-ticket-purchase`, `implement-payment-reliability`, `implement-checkin-offline-sync`, and `harden-submission`.
