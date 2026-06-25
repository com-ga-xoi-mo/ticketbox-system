# TicketBox Check-in Mobile

React Native mobile app foundation for TicketBox check-in staff.

This app belongs to the `implement-checkin-mobile-app` change. It provides the mobile workspace, staff session handling, assignment loading boundary, QR scan workflow state, and tests. Backend check-in endpoint implementation belongs to `implement-checkin-api`. Offline queue, SQLite persistence, batch sync, retry UI, and conflict handling belong to `implement-checkin-offline-sync`.

## Local Setup

From the repository root:

```bash
npm install
npm run dev:checkin-mobile
```

The app reads the backend API base URL from:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

If the variable is not set, the app defaults to `http://localhost:3000`.

## Verification

The foundation can be verified without a live backend check-in API:

```bash
npm run verify:checkin-mobile
```

This runs TypeScript checks for the testable mobile core and unit tests for:

- session save, restore, and logout
- check-in staff role blocking
- bearer-token API requests
- assignment loading and selected-assignment gating
- QR scan workflow state transitions
- duplicate local decode suppression while a scan is in flight
- network or unavailable results not becoming local accepted state
- raw decoded QR payload forwarding to the API client

## API Boundary

The mobile app expects future backend endpoints equivalent to:

```text
POST /auth/login
GET  /checkin/assignments
POST /checkin/scan
```

Authenticated requests include:

```text
Authorization: Bearer <token>
```

Expected assignment shape:

```ts
type StaffAssignment = {
  assignmentId: string;
  concertId: string;
  concertTitle: string;
  gate?: string;
  startsAt?: string;
  status: 'ACTIVE' | 'REVOKED';
};
```

Expected online scan request shape:

```ts
type OnlineScanRequest = {
  assignmentId: string;
  concertId: string;
  gate?: string;
  qrPayload: string;
  scannedAt: string;
  deviceId: string;
};
```

Expected scan result statuses:

```text
accepted
duplicate
invalid
unauthorized
unassigned
network-error
unavailable
```

The mobile scanner treats the decoded QR payload as opaque input. It forwards the raw payload to the check-in API and does not decide ticket validity, concert match, duplicate status, or staff assignment authorization locally. The backend remains the source of truth for check-in acceptance.

## Deferred Scope

This change does not implement:

- backend online scan endpoint or duplicate prevention
- server-side check-in staff assignment authorization
- SQLite offline scan queue
- batch sync endpoint
- retry/sync status UI for offline scans
- offline conflict handling

Those are owned by later OpenSpec changes.
