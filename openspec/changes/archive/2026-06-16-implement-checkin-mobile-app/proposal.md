## Why

TicketBox needs the React Native check-in app foundation in Wave 2 so Member 4 can build and verify the mobile staff workflow in parallel with backend check-in API work. The accepted `checkin-offline-sync` and `identity-access` target specs define the system behavior, but this change scopes the first mobile slice: app skeleton, authenticated staff session handling, assignment loading, QR scan UI foundation, and clear API integration boundaries.

## What Changes

- Add a React Native check-in app workspace under `apps/` with project scripts, TypeScript configuration, lint/test wiring, and a minimal app shell.
- Implement check-in staff login/session handling using the accepted JWT bearer-token model from `identity-access`.
- Add authenticated staff assignment loading so the app can show which concerts or gates the staff user may scan for.
- Add QR scan UI foundation and scan workflow state for ready, scanning, submitting, accepted, rejected, unauthorized, and network/error outcomes.
- Define an API client boundary for auth, assignment loading, and online scan submission that can integrate with the later `implement-checkin-api` backend change.
- Keep offline queue, SQLite persistence, batch sync, retry UI, and conflict resolution out of scope for this change; those belong to `implement-checkin-offline-sync`.
- Add mobile-focused unit/component verification for auth state, API client behavior, assignment loading, and scan workflow state transitions.
- Do not implement backend check-in endpoints, duplicate prevention, or server-side staff assignment authorization in this change.

## Capabilities

### New Capabilities

- `checkin-mobile-app`: React Native mobile app foundation for check-in staff authentication, assignment loading, QR scan UI workflow, and backend API integration boundaries.

### Modified Capabilities

- None.

This change implements a mobile-facing slice that references the accepted `checkin-offline-sync` and `identity-access` target specs without changing their requirements. If implementation reveals a target contract gap, a later OpenSpec change should explicitly modify the relevant accepted spec.

## Impact

- Affected code: new React Native workspace under `apps/checkin-mobile/`, mobile app scripts/config, mobile auth/session state, API client boundary, scan workflow state, QR scanner UI shell, and focused tests.
- Affected APIs: consumes existing or future JWT auth endpoints and a future check-in assignment/scan API contract; backend endpoint implementation remains owned by `implement-checkin-api`.
- Affected dependencies: likely React Native/Expo or the repo-standard React Native setup, secure/lightweight token storage, network client utilities, and QR scanner/camera package wiring.
- Affected systems: mobile app runtime only; no PostgreSQL, Redis, BullMQ, payment, notification, AI, or CSV import changes.
- Cross-team contracts: depends on Member 1's auth/JWT contract and future Member 4 `implement-checkin-api` endpoints for staff assignments and online scan submission.
- Primary references: `openspec/specs/checkin-offline-sync/spec.md`, `openspec/specs/identity-access/spec.md`, `blueprint/design.md`, `blueprint/specs/checkin.md`, `blueprint/specs/auth.md`, `docs/team-change-plan.md`, and `docs/roadmap.md`.
- Branch: `feature/implement-checkin-mobile-app`.
