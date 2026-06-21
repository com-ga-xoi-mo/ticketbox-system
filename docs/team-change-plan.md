# TicketBox Team Change Plan

This document defines how the 4-person team should split implementation work after the blueprint has been accepted. The team will use OpenSpec through slash commands in chat with AI, not by manually running OpenSpec CLI commands.

## Working Model

Each implementation unit should follow this mapping:

```text
1 branch = 1 OpenSpec change = 1 pull request = 1 reviewable deliverable
```

The archived `openspec/specs/` folder is the target system contract. A capability appearing in `openspec/specs/` means "this is the accepted behavior the system must satisfy", not "this has already been implemented".

Implementation progress is tracked through:

- active OpenSpec changes
- branch and pull request status
- task checklists inside each change
- tests and demo evidence
- `docs/roadmap.md`

## Slash-Only Workflow

The team should interact with OpenSpec through slash commands in chat with AI.

### Create a change

Use:

```text
[$openspec-propose] implement-change-name

Create an OpenSpec change for this scope. Reference the relevant target specs in `openspec/specs/`. Generate proposal, design, specs delta if needed, and tasks. Do not implement code yet.
```

Example:

```text
[$openspec-propose] implement-inventory-reservation

Create an implementation change for atomic ticket inventory reservation. Reference the archived `ticket-purchase` target spec. Include database transaction design, row-level locking, reservation expiration, and concurrency tests.
```

### Explore a design question

Use:

```text
[$openspec-explore] <change-name>

I need to think through this design issue before implementation: ...
```

### Implement a change

Use:

```text
[$openspec-apply-change] <change-name>
```

The AI should read the change artifacts, implement tasks, update checkboxes, and stop if a task is unclear or the implementation reveals a design issue.

### Archive a completed change

Use:

```text
[$openspec-archive-change] <change-name>
```

Archive only after code, tests, docs, and review are complete for that change.

## Team Ownership

The project is split by vertical ownership. Each member owns their changes end to end: design, API/database impact, implementation, UI or demo surface if applicable, tests, docs, and final demo evidence.

### Member 1: Foundation and Identity

Responsibilities:

- platform foundation
- database/migration base
- authentication
- RBAC
- admin/check-in access control
- setup documentation

Changes:

- `implement-platform-foundation`
- `implement-database-migrations-and-seed`
- `implement-auth-rbac`
- `implement-admin-access-control`
- `harden-docs-and-demo-data`

### Member 2: Concert, Admin, Catalog

Responsibilities:

- public concert catalog
- concert detail
- organizer/admin concert management
- ticket type configuration
- seating map assets
- concert availability display and caching coordination

Changes:

- `implement-concert-catalog`
- `implement-concert-admin-management`
- `implement-seating-map-assets`
- `implement-concert-caching`

### Member 3: Ticketing, Payment, Protection

Responsibilities:

- order lifecycle
- inventory reservation
- per-user ticket limits
- QR ticket issuance
- payment simulator
- payment idempotency
- payment circuit breaker
- rate limiting
- concurrency and reliability tests

Changes:

- `implement-order-lifecycle`
- `implement-inventory-reservation`
- `implement-per-user-ticket-limit`
- `implement-qr-ticket-issuance`
- `implement-payment-simulator`
- `implement-payment-idempotency`
- `implement-payment-circuit-breaker`
- `implement-rate-limiting`
- `harden-concurrency-tests`

### Member 4: Operations, Mobile, Integrations

Responsibilities:

- notification delivery
- reminder jobs
- AI artist bio
- guest list import
- check-in API
- React Native check-in app
- offline check-in sync

Changes:

- `implement-notification-delivery`
- `implement-concert-reminders`
- `implement-ai-artist-bio`
- `implement-guest-list-import`
- `implement-checkin-api`
- `implement-checkin-mobile-app`
- `implement-checkin-offline-sync`

## Recommended Change Backlog

### Foundation

#### `implement-platform-foundation`

Owner: Member 1

Scope:

- NestJS backend skeleton
- project structure
- Docker Compose
- PostgreSQL connection
- Redis connection
- BullMQ worker skeleton
- config/env loading
- health check
- base README

Branch:

```text
feature/implement-platform-foundation
```

Primary specs:

- `project-governance`
- `submission-readiness`

#### `implement-database-migrations-and-seed`

Owner: Member 1

Scope:

- migration setup
- base schema
- seed users
- seed sample concerts
- seed ticket types and zones

Branch:

```text
feature/implement-database-migrations-and-seed
```

Primary specs:

- `concert-management`
- `ticket-purchase`
- `submission-readiness`

### Identity and Access

#### `implement-auth-rbac`

Owner: Member 1

Scope:

- register/login
- JWT or session handling
- password hashing
- roles
- guards
- role-based endpoint protection

Branch:

```text
feature/implement-auth-rbac
```

Primary specs:

- `identity-access`

#### `implement-admin-access-control`

Owner: Member 1

Scope:

- admin route protection
- organizer ownership checks
- check-in staff assignment model
- admin/check-in permission tests

Branch:

```text
feature/implement-admin-access-control
```

Primary specs:

- `identity-access`
- `checkin-offline-sync`

### Concert and Admin

#### `implement-concert-catalog`

Owner: Member 2

Scope:

- public concert list
- concert detail
- ticket type display
- availability snapshot API
- customer UI list/detail

Branch:

```text
feature/implement-concert-catalog
```

Primary specs:

- `concert-management`

#### `implement-concert-admin-management`

Owner: Member 2

Scope:

- admin create/update/cancel concert
- configure ticket types
- sale windows
- max-per-user configuration
- admin UI

Branch:

```text
feature/implement-concert-admin-management
```

Primary specs:

- `concert-management`

#### `implement-seating-map-assets`

Owner: Member 2

Scope:

- SVG seating map upload/store
- zone display for GA, SVIP, VIP, CAT1, CAT2
- zone-to-ticket-type mapping

Branch:

```text
feature/implement-seating-map-assets
```

Primary specs:

- `concert-management`

### Ticketing and Payment

#### `implement-order-lifecycle`

Owner: Member 3

Scope:

- order tables
- order states
- order items
- pending/paid/expired/failed transitions

Branch:

```text
feature/implement-order-lifecycle
```

Primary specs:

- `ticket-purchase`

#### `implement-inventory-reservation`

Owner: Member 3

Scope:

- PostgreSQL row-level lock
- no-oversell logic
- reservation TTL
- expired reservation release worker
- Does not enforce `max_per_user`; continue with `implement-per-user-ticket-limit` after this change is complete

Branch:

```text
feature/implement-inventory-reservation
```

Primary specs:

- `ticket-purchase`

#### `implement-per-user-ticket-limit`

Owner: Member 3

Scope:

- max tickets per user enforcement
- depends on completed inventory reservation transaction path
- count paid orders plus active, unexpired reservations for the same user and ticket type
- concurrent same-user request protection
- tests for limit bypass attempts

Branch:

```text
feature/implement-per-user-ticket-limit
```

Primary specs:

- `ticket-purchase`

#### `implement-qr-ticket-issuance`

Owner: Member 3

Scope:

- ticket issuance after paid order
- QR token generation
- QR hash storage
- customer ticket detail API
- frontend ticket QR display as a follow-up change after backend issuance is complete

Branch:

```text
feature/implement-qr-ticket-issuance
```

Primary specs:

- `ticket-purchase`

Follow-up after backend issuance:

- `implement-customer-ticket-qr-page`
- Scope: fetch ticket detail and render QR code in the customer UI using `qrPayload`
- Start this only after `implement-qr-ticket-issuance` is complete and archived

#### `implement-payment-simulator`

Owner: Member 3

Scope:

- VNPAY/MoMo-like payment simulator
- redirect URL
- callback
- success/failure/timeout/duplicate callback behavior

Branch:

```text
feature/implement-payment-simulator
```

Primary specs:

- `payment-reliability`

#### `implement-payment-idempotency`

Owner: Member 3

Scope:

- idempotency key handling
- duplicate payment initiation handling
- duplicate callback handling
- provider transaction dedupe

Branch:

```text
feature/implement-payment-idempotency
```

Primary specs:

- `payment-reliability`

#### `implement-payment-circuit-breaker`

Owner: Member 3

Scope:

- Redis circuit breaker state
- closed/open/half-open behavior
- graceful payment degradation
- recovery tests

Branch:

```text
feature/implement-payment-circuit-breaker
```

Primary specs:

- `payment-reliability`
- `platform-protection`

### Platform Protection

#### `implement-rate-limiting`

Owner: Member 3

Scope:

- Redis token bucket rate limiting
- checkout/payment/admin/check-in limits
- `429` response
- retry-after behavior

Branch:

```text
feature/implement-rate-limiting
```

Primary specs:

- `platform-protection`

#### `implement-concert-caching`

Owner: Member 2

Scope:

- cache concert list/detail
- short-TTL availability cache
- invalidation on reservation/payment/expiration

Branch:

```text
feature/implement-concert-caching
```

Primary specs:

- `platform-protection`
- `concert-management`

### Notifications, AI, Guest List

#### `implement-notification-delivery`

Owner: Member 4

Scope:

- in-app notification persistence
- email adapter
- purchase confirmation worker
- retry attempts

Branch:

```text
feature/implement-notification-delivery
```

Primary specs:

- `notification-delivery`

#### `implement-concert-reminders`

Owner: Member 4

Scope:

- 24-hour reminder worker
- scheduled job
- reminder notification queue

Branch:

```text
feature/implement-concert-reminders
```

Primary specs:

- `notification-delivery`

#### `implement-ai-artist-bio`

Owner: Member 4

Scope:

- PDF upload
- text extraction
- text cleanup
- GeminiAI-compatible adapter
- deterministic local fallback
- admin approval for generated bio

Branch:

```text
feature/implement-ai-artist-bio
```

Primary specs:

- `ai-artist-bio`

#### `implement-guest-list-import`

Owner: Member 4

Scope:

- CSV upload or scheduled import
- CSV validation
- duplicate handling
- import report
- idempotent file checksum handling

Branch:

```text
feature/implement-guest-list-import
```

Primary specs:

- `guest-list-import`

### Check-in

#### `implement-checkin-api`

Owner: Member 4

Scope:

- online QR check-in endpoint
- duplicate prevention
- staff assignment check
- check-in result model

Branch:

```text
feature/implement-checkin-api
```

Primary specs:

- `checkin-offline-sync`
- `identity-access`

#### `implement-checkin-mobile-app`

Owner: Member 4

Scope:

- React Native app skeleton
- login/session
- QR scan UI
- online scan flow

Branch:

```text
feature/implement-checkin-mobile-app
```

Primary specs:

- `checkin-offline-sync`

#### `implement-checkin-offline-sync`

Owner: Member 4

Scope:

- SQLite offline queue
- AsyncStorage for lightweight state only
- batch sync
- conflict results
- retry UI

Branch:

```text
feature/implement-checkin-offline-sync
```

Primary specs:

- `checkin-offline-sync`

### Hardening and Submission

#### `harden-concurrency-tests`

Owner: Member 3

Scope:

- no-oversell test
- per-user limit test
- payment idempotency test
- circuit breaker test

Branch:

```text
feature/harden-concurrency-tests
```

Primary specs:

- `ticket-purchase`
- `payment-reliability`
- `platform-protection`

#### `harden-docs-and-demo-data`

Owner: Member 1

Scope:

- README
- seed data polish
- demo accounts
- sample CSV
- sample PDF
- demo script

Branch:

```text
feature/harden-docs-and-demo-data
```

Primary specs:

- `submission-readiness`

#### `prepare-final-submission`

Owner: Team lead

Scope:

- final blueprint sync
- Drive structure
- video checklist
- final smoke test

Branch:

```text
feature/prepare-final-submission
```

Primary specs:

- `submission-readiness`
- `project-governance`

## Execution Waves

### Wave 1: Shared foundation

Start first:

- `implement-platform-foundation`
- `implement-database-migrations-and-seed`

These unblock most other branches.

### Wave 2: Independent vertical starts

Start after foundation is minimally usable:

- `implement-auth-rbac`
- `implement-concert-catalog`
- `implement-order-lifecycle`
- `implement-notification-delivery`
- `implement-checkin-mobile-app`

### Wave 3: Main features

Start after relevant base modules exist:

- `implement-admin-access-control`
- `implement-concert-admin-management`
- `implement-seating-map-assets`
- `implement-inventory-reservation`
- `implement-payment-simulator`
- `implement-checkin-api`
- `implement-ai-artist-bio`
- `implement-guest-list-import`

### Wave 4: Reliability and offline behavior

Start after main flows exist. For Member 3 ticketing work, do `implement-per-user-ticket-limit` immediately after `implement-inventory-reservation` before QR issuance/payment hardening, because it extends the checkout transaction path.

- `implement-per-user-ticket-limit`
- `implement-qr-ticket-issuance`
- `implement-payment-idempotency`
- `implement-payment-circuit-breaker`
- `implement-rate-limiting`
- `implement-concert-caching`
- `implement-checkin-offline-sync`
- `implement-concert-reminders`

### Wave 5: Hardening and submission

Start near final integration:

- `harden-concurrency-tests`
- `harden-docs-and-demo-data`
- `prepare-final-submission`

## Required Cross-Team Contracts

Even with independent ownership, the team must agree on a few contracts before implementation branches drift.

### Auth contract

- user id format
- roles
- token/session format
- current user payload

### Concert contract

- concert id
- ticket type id
- ticket type fields
- availability response shape

### Order and payment contract

- order status values
- payment status values
- idempotency key header/body location
- payment callback payload shape

### Ticket and QR contract

- QR token payload
- token hash behavior
- ticket status values

### Check-in contract

- scan request shape
- sync batch request shape
- per-event sync result values

### Worker event contract

- `order.paid`
- `order.expired`
- `concert.reminder_due`
- `artist_bio.requested`
- `guest_list.import_requested`

## Rules for Branches and Changes

- Every implementation branch must have a matching OpenSpec change.
- Every OpenSpec change must reference the relevant archived target specs.
- Every branch should have one owner.
- Do not merge a branch if its change is invalid.
- Do not archive an implementation change until code, tests, and docs for that change are complete.
- If implementation changes a target behavior, create or update an OpenSpec change explicitly.
- Do not silently let code drift away from `openspec/specs/`.

