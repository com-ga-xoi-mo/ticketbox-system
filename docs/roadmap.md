# TicketBox 5-Week Implementation Roadmap

This roadmap is the team's official implementation plan for building TicketBox after the blueprint is accepted. It is not the OpenSpec apply checklist for `define-ticketbox-blueprint`; implementation work should be split into separate OpenSpec changes.

## 1. Week 1 - Blueprint and Architecture Baseline

- [ ] 1.1 Review `docs/requirements.md` and confirm the functional and non-functional requirements with the team
- [ ] 1.2 Finalize the modular monolith architecture and bounded-context module list
- [ ] 1.3 Finalize C4 Level 1 and C4 Level 2 diagrams in the blueprint
- [ ] 1.4 Finalize the high-level architecture diagram and critical data flows
- [ ] 1.5 Finalize the PostgreSQL schema draft and Redis responsibility list
- [ ] 1.6 Finalize ADRs for NestJS modular monolith, PostgreSQL, Redis, payment simulator, React Native check-in, and BullMQ worker queue
- [ ] 1.7 Review all OpenSpec capability specs for testability and missing scenarios
- [ ] 1.8 Split implementation ownership across the 4 team members

## 2. Week 1 - Platform Foundation

- [ ] 2.1 Create repository structure for backend API, customer web, admin web, React Native check-in app, worker, data, and docs
- [ ] 2.2 Configure Docker Compose for backend, frontend apps, PostgreSQL, Redis, worker, mail dev server, and object storage or local file storage
- [ ] 2.3 Add database migration tooling and initial schema migration
- [ ] 2.4 Add seed script for required sample concerts, ticket types, prices, sale windows, limits, and seating zones
- [ ] 2.5 Add shared backend error format, configuration loading, request logging, and health check endpoints
- [ ] 2.6 Add OpenAPI or API documentation generation

## 3. Week 2 - Identity Access and Concert Management

- [ ] 3.1 Implement user registration, login, session/token handling, and password hashing
- [ ] 3.2 Implement roles and permission checks for audience, organizer, check-in staff, and admin
- [ ] 3.3 Implement backend route guards and use-case-level ownership checks
- [ ] 3.4 Implement public concert list and concert detail APIs
- [ ] 3.5 Implement organizer concert create, update, publish, and cancel APIs
- [ ] 3.6 Implement ticket type configuration APIs with validation for price, quantity, sale windows, and max-per-user
- [ ] 3.7 Implement customer concert list/detail UI with seating map zone display
- [ ] 3.8 Implement admin concert and ticket type management UI
- [ ] 3.9 Add tests for RBAC, organizer ownership, concert validation, and public catalog behavior

## 4. Week 3 - Ticket Purchase Core

- [ ] 4.1 Implement order and order item persistence with order lifecycle states
- [ ] 4.2 Implement atomic inventory reservation using PostgreSQL transaction and row-level lock
- [ ] 4.3 Implement per-user ticket limit enforcement across paid orders and active reservations
- [ ] 4.4 Implement reservation expiration worker that releases unpaid inventory
- [ ] 4.5 Implement QR e-ticket generation with hashed token storage
- [ ] 4.6 Implement customer checkout UI from ticket selection to pending payment
- [ ] 4.7 Implement customer order and ticket detail pages
- [ ] 4.8 Add concurrency tests proving no oversell for limited SVIP inventory
- [ ] 4.9 Add tests proving concurrent requests from the same user cannot bypass max-per-user limit

## 5. Week 3 - Payment Reliability

- [ ] 5.1 Implement payment gateway port and VNPAY/MoMo-like simulator adapter
- [ ] 5.2 Implement payment initiation endpoint with idempotency key support
- [ ] 5.3 Implement provider callback endpoint with provider event deduplication
- [ ] 5.4 Implement successful payment fulfillment that marks order paid and issues tickets exactly once
- [ ] 5.5 Implement failed, timed-out, duplicate, and delayed callback handling
- [ ] 5.6 Implement payment reconciliation worker for stale pending payments
- [ ] 5.7 Implement payment circuit breaker states in Redis
- [ ] 5.8 Add tests for duplicate payment initiation, duplicate callback, timeout, failure, and circuit breaker recovery

## 6. Week 4 - Platform Protection and Notifications

- [ ] 6.1 Implement Redis-backed token bucket rate limiting for browsing, checkout, payment initiation, admin writes, and check-in sync
- [ ] 6.2 Implement cache-aside for concert list and concert detail
- [ ] 6.3 Implement short-TTL availability cache and invalidation on reservation, expiration, and payment completion
- [ ] 6.4 Implement graceful degradation responses when payment provider is unavailable
- [ ] 6.5 Implement in-app notification persistence
- [ ] 6.6 Implement email notification adapter and purchase confirmation worker
- [ ] 6.7 Implement 24-hour concert reminder worker
- [ ] 6.8 Add tests for rate limiting, cache hit/invalidation behavior, and notification retry behavior

## 7. Week 4 - AI Artist Bio and Guest List Import

- [ ] 7.1 Implement object storage adapter for uploaded PDFs, CSV files, posters, and seating maps
- [ ] 7.2 Implement admin PDF press kit upload and artist bio job creation
- [ ] 7.3 Implement PDF text extraction, cleanup, AI adapter invocation, and retryable failure handling
- [ ] 7.4 Implement admin review or publication of generated artist bio
- [ ] 7.5 Implement scheduled CSV discovery/import worker for sponsor VIP guest list files
- [ ] 7.6 Implement CSV header validation, row validation, duplicate detection, and import reports
- [ ] 7.7 Implement VIP guest lookup for check-in staff
- [ ] 7.8 Add tests for PDF validation, AI job failure/retry, invalid CSV, duplicate CSV rows, and idempotent re-import

## 8. Week 5 - Offline Check-in

- [ ] 8.1 Implement React Native check-in app authentication and staff assignment loading
- [ ] 8.2 Implement online QR scan endpoint with duplicate prevention
- [ ] 8.3 Implement React Native QR scan UI for online and offline modes
- [ ] 8.4 Implement local offline scan queue using device persistent storage
- [ ] 8.5 Implement batch sync endpoint with per-event accepted, duplicate, invalid, and conflict results
- [ ] 8.6 Implement retry and sync status UI for pending offline scans
- [ ] 8.7 Add tests for online duplicate prevention, offline queue persistence, successful sync, and conflict rejection

## 9. Week 5 - Hardening and Submission Readiness

- [ ] 9.1 Run full integration test suite for auth, concert management, ticket purchase, payment, notifications, CSV import, AI bio, and check-in
- [ ] 9.2 Run load/concurrency scripts for oversell prevention, per-user limit, rate limit, and cache behavior
- [ ] 9.3 Complete README with setup, environment variables, seed data, test commands, and demo accounts
- [ ] 9.4 Export or mirror OpenSpec artifacts into the course-required `blueprint/` structure
- [ ] 9.5 Prepare sample CSV files, PDF press kit files, seating maps, and demo scripts
- [ ] 9.6 Record demo video showing required business flows and technical mechanisms
- [ ] 9.7 Validate final OpenSpec change and archive it when the team accepts the blueprint
