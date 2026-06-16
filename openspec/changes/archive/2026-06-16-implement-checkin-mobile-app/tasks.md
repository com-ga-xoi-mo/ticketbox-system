## 1. Mobile Workspace Setup

- [x] 1.1 Create `apps/checkin-mobile/` as an Expo-managed React Native npm workspace with TypeScript app entrypoint and package scripts.
- [x] 1.2 Add mobile-specific TypeScript, lint, format, and test configuration without breaking existing API/worker commands.
- [x] 1.3 Add root-level convenience scripts only if needed, such as `dev:checkin-mobile` and `test:checkin-mobile`.
- [x] 1.4 Add mobile environment configuration for the backend API base URL and document local defaults.
- [x] 1.5 Add a basic app shell with navigation between unauthenticated, assignment, and scanner states.

## 2. API Client and Session Foundations

- [x] 2.1 Define typed mobile API client interfaces for auth login, staff assignment loading, and online scan submission.
- [x] 2.2 Implement a concrete HTTP client adapter that can attach `Authorization: Bearer <token>` to authenticated requests.
- [x] 2.3 Add a replaceable `SessionStore` interface with secure mobile storage for runtime and in-memory storage for tests.
- [x] 2.4 Implement auth state management for login success, session restore, token refresh placeholder if needed, and logout.
- [x] 2.5 Ensure non-`CHECKIN_STAFF` profiles are blocked from scanner workflows in the mobile state layer.

## 3. Check-in Staff Login UI

- [x] 3.1 Build the login screen with email/password inputs, submit state, validation feedback, and API error display.
- [x] 3.2 Wire login screen submission to the auth API client and session state.
- [x] 3.3 Add logout action from the authenticated app area and verify it clears the stored session.
- [x] 3.4 Add session restoration on app startup before showing authenticated screens.

## 4. Assignment Loading and Selection

- [x] 4.1 Define the mobile `StaffAssignment` DTO matching the expected future `implement-checkin-api` contract.
- [x] 4.2 Load active staff assignments after login or restored session using the authenticated API client.
- [x] 4.3 Build assignment list, selected assignment, loading, empty, authorization-error, and retry states.
- [x] 4.4 Prevent scanner access until one active assignment is selected.
- [x] 4.5 Document that server-side assignment authorization remains owned by `implement-checkin-api` and `identity-access`.

## 5. QR Scanner UI and Online Scan Boundary

- [x] 5.1 Add QR scanner screen foundation with camera permission handling or a test-friendly decoded-payload entry path.
- [x] 5.2 Define `OnlineScanRequest` and scan result status types for accepted, duplicate, invalid, unauthorized, unassigned, network-error, and unavailable outcomes.
- [x] 5.3 Implement scan workflow state transitions for ready, scanning, submitting, result, recoverable error, and reset/rescan.
- [x] 5.4 Debounce or ignore repeated QR decode events while one online scan submission is in flight.
- [x] 5.5 Wire decoded QR payloads to the injected `CheckinApiClient` without hard-coding local success.
- [x] 5.6 Show network or endpoint-unavailable results without marking tickets as accepted locally.
- [x] 5.7 Leave offline queue persistence, batch sync, retry queue, and conflict-resolution UI as explicit TODO boundaries for `implement-checkin-offline-sync`.
- [x] 5.8 Ensure the mobile scanner treats decoded QR payloads as opaque strings and does not perform ticket validity, concert, duplicate, or assignment authorization checks locally.

## 6. Tests and Verification

- [x] 6.1 Add tests for session store behavior, login success, session restore, logout, and non-staff blocking.
- [x] 6.2 Add tests proving authenticated API requests include the JWT bearer token.
- [x] 6.3 Add tests for assignment loading success, empty assignments, recoverable errors, and selected-assignment gating.
- [x] 6.4 Add tests for scan workflow state transitions using a fake `CheckinApiClient`.
- [x] 6.5 Add tests proving duplicate QR decode events are ignored while a scan submission is in flight.
- [x] 6.6 Add tests proving network or unavailable scan responses do not produce accepted local state.
- [x] 6.7 Add a mobile verification command and confirm it passes without a live backend check-in API.
- [x] 6.8 Add a test proving the scan workflow forwards the raw decoded QR payload to `CheckinApiClient` and leaves ticket validity decisions to the API response.

## 7. Documentation and Cross-Change Notes

- [x] 7.1 Add `apps/checkin-mobile/README.md` with local setup, run commands, test commands, and API base URL configuration.
- [x] 7.2 Document expected future backend endpoints or DTOs consumed from `implement-checkin-api`.
- [x] 7.3 Document that offline queue, SQLite persistence, batch sync, and conflict handling are deferred to `implement-checkin-offline-sync`.
- [x] 7.4 Update root README or developer notes only if the mobile app adds new required setup steps.
- [x] 7.5 Run the available mobile tests or verification script and record the command result in the implementation notes when applying this change.
- [x] 7.6 Re-run `openspec status --change "implement-checkin-mobile-app"` after task updates and confirm the change remains apply-ready.
