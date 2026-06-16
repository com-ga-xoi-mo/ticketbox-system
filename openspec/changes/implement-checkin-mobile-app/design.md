## Context

TicketBox is using a repo-local npm workspace with backend API and worker apps already present under `apps/`. The blueprint calls for a React Native check-in app used by `CHECKIN_STAFF` at venue gates, including poor-network and offline behavior later in the roadmap. This change is the Wave 2 mobile foundation owned by Member 4; it should unblock UI/workflow work while `implement-checkin-api` and `implement-checkin-offline-sync` remain separate future changes.

Relevant target contracts:

- `identity-access` defines JWT bearer-token sessions and check-in staff assignment authorization.
- `checkin-offline-sync` defines online QR check-in, offline scan queue, batch sync, conflict handling, and assigned-staff requirements.
- `docs/team-change-plan.md` places `implement-checkin-mobile-app` in Wave 2 and `implement-checkin-api` plus `implement-checkin-offline-sync` in later waves.

Current constraints:

- There is no existing `apps/checkin-mobile/` workspace.
- Backend check-in scan and sync endpoints may not exist yet when this change is implemented.
- The mobile app must not fake backend correctness; it should expose clear API client boundaries and typed result handling so later backend work can plug in.
- Offline SQLite queue and batch sync are explicitly out of scope for this change.

## Goals / Non-Goals

**Goals:**

- Create `apps/checkin-mobile/` as a React Native app workspace with TypeScript, scripts, environment configuration, and test setup.
- Provide a minimal mobile app shell for check-in staff: login screen, assignment selection/status screen, scanner screen, and scan result feedback.
- Store and restore the JWT session through a mobile session storage adapter without coupling UI code to storage implementation details.
- Load staff assignments after login using an authenticated API client call and display empty/error/loaded states.
- Implement QR scan workflow state with injected API client behavior for decoded QR payloads, online submission, result mapping, and retry-friendly errors.
- Keep mobile UI, API client, auth/session state, and scan workflow as separate modules.
- Add tests or verification steps for auth state, API client header behavior, assignment loading, and scan workflow state transitions.

**Non-Goals:**

- No backend endpoint implementation for login, assignment loading, online scan, offline sync, or duplicate prevention.
- No server-side staff assignment authorization; this remains owned by `identity-access`, `implement-admin-access-control`, and `implement-checkin-api`.
- No SQLite offline queue, AsyncStorage offline scan persistence, batch sync, conflict-resolution UI, or retry queue; those belong to `implement-checkin-offline-sync`.
- No production device management, MDM, push notifications, or app-store packaging.
- No real payment, ticket issuance, QR token generation, notification, AI, or guest-list changes.

## Decisions

### Decision 1: Use Expo-managed React Native for the first mobile foundation

Create `apps/checkin-mobile/` as an Expo-managed React Native app inside the existing npm workspace. Expo keeps the setup small for a 5-week course project, supports camera/barcode scanning, and gives the team a fast local demo path without native project maintenance.

Rationale:

- The project needs a demonstrable mobile app quickly, not custom native modules.
- Expo works well for camera/QR UI foundations and local device/simulator demos.
- The npm workspace can run mobile scripts independently from backend API and worker scripts.

Alternatives considered:

- Bare React Native CLI: gives full native control but adds Android/iOS project maintenance that is too heavy for this change.
- Web-only scanner page: easier, but it would not satisfy the blueprint's React Native mobile app direction.

### Decision 2: Separate UI screens from workflow and API modules

Use a simple internal module boundary:

```text
apps/checkin-mobile/
  src/app/
  src/features/auth/
  src/features/assignments/
  src/features/scanner/
  src/api/
  src/storage/
  src/test/
```

UI components call feature hooks or workflow services. Feature logic depends on interfaces such as `AuthApiClient`, `AssignmentApiClient`, `CheckinApiClient`, and `SessionStore`. Concrete HTTP and storage adapters live at the edge.

Rationale:

- Keeps scan workflow testable before real backend endpoints are complete.
- Makes later offline sync work additive instead of rewriting UI state.
- Prevents camera components from owning auth/session or API response mapping.

Alternatives considered:

- Put all mobile logic in screen components. This is faster initially but makes workflow testing and later offline queue integration harder.
- Share backend domain packages directly in the app. This risks coupling the mobile app to server internals instead of stable HTTP contracts.

### Decision 3: Use JWT bearer-token session handling behind a mobile session store

After login, the app stores the access token and minimal staff profile data through `SessionStore`. Requests use `Authorization: Bearer <token>`. The first implementation may use Expo secure storage when available and a test/in-memory store for unit tests.

Rationale:

- Matches the accepted `identity-access` JWT contract.
- Keeps token storage replaceable if the team changes storage package during Expo setup.
- Lets tests verify session restoration and logout without device storage.

Alternatives considered:

- Keep token only in React state. Rejected because staff should not need to log in again after every app restart during a venue shift.
- Store broad user data locally. Rejected because this change only needs minimal profile/role/session data.

### Decision 4: Treat assignment loading as a required gate before scanning

After login/session restore, the app loads staff assignments. The scanner screen should require one active selected assignment before allowing scan submission. If no assignments are returned, the app should show a blocked state instead of letting staff scan against an unknown concert.

Recommended response shape for the future API boundary:

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

Rationale:

- Aligns the mobile app with the accepted assigned-staff requirement.
- Reduces accidental scans for the wrong concert/gate.
- Gives `implement-checkin-api` a clear consumer contract without requiring this change to build the backend endpoint.

Alternatives considered:

- Let staff scan first and rely entirely on the server to reject unassigned scans. The server still must authorize every scan, but the mobile app should avoid an obviously wrong workflow.

### Decision 5: Define online scan as an API-client integration boundary

When the scanner decodes a QR payload, the workflow should create an online scan request through an injected `CheckinApiClient`. The app maps the API result into UI states such as `accepted`, `duplicate`, `invalid`, `unauthorized`, `unassigned`, and `network-error`.

Recommended future request shape:

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

The concrete backend route remains owned by `implement-checkin-api`; this change can test the workflow with a fake client and wire the HTTP adapter to a configurable path.

The mobile app treats the QR payload as opaque input. It SHALL pass the decoded payload to the check-in API without attempting to validate ticket ownership, concert match, duplicate status, or assignment authorization locally. Server-side check-in validation remains the source of truth.

Rationale:

- Prevents mobile work from blocking on backend check-in implementation.
- Makes result states explicit for later duplicate-prevention and conflict handling.
- Avoids hard-coded demo success that would hide missing API behavior.

Alternatives considered:

- Implement a local-only scan success path. Rejected because it would overstate check-in correctness and conflict with the target spec.
- Wait for `implement-checkin-api` before building UI. Rejected because Wave 2 expects the mobile foundation to start independently.

### Decision 6: Keep offline sync extension points without implementing offline queue

The scanner workflow should define stable types for scan payloads, result statuses, and device metadata, but it should not persist unsynced scans in SQLite in this change. The later `implement-checkin-offline-sync` change can add queue storage and batch sync around the same workflow types.

Rationale:

- Keeps this change small and Wave 2-appropriate.
- Avoids mixing the basic mobile app skeleton with the more complex offline correctness problem.
- Still prevents a throwaway scanner implementation.

Alternatives considered:

- Add AsyncStorage queue now. Rejected because the blueprint says offline scan events need durable local storage, preferably SQLite, and that belongs in the offline sync change.

## Risks / Trade-offs

- [Risk] Expo dependency setup may add more packages than the current backend-only workspace. -> Mitigation: isolate mobile dependencies to `apps/checkin-mobile` and keep root scripts minimal.
- [Risk] Backend endpoint paths or payloads may change in `implement-checkin-api`. -> Mitigation: centralize all paths and DTO mapping in the mobile API client and document the expected contract in this design.
- [Risk] Camera/QR tests can be brittle in CI. -> Mitigation: test scan workflow with decoded QR payloads and fake clients; keep camera module verification as a local smoke step.
- [Risk] Storing JWTs incorrectly could leak staff access tokens. -> Mitigation: use a storage adapter intended for secure mobile storage where available and keep tests on in-memory storage.
- [Risk] Users may mistake this change for complete check-in support. -> Mitigation: tasks and UI labels should make online API availability and offline queue scope explicit, and final verification should list dependencies on `implement-checkin-api` and `implement-checkin-offline-sync`.

## Migration Plan

1. Add the `apps/checkin-mobile/` workspace and mobile package scripts.
2. Add the app shell, navigation, theme, and environment configuration.
3. Add auth/session modules, API client abstractions, and storage adapters.
4. Add assignment loading UI and selected-assignment state.
5. Add QR scanner UI foundation and scan workflow result states using an injected check-in API client.
6. Add focused unit/component tests for auth, assignment loading, API headers, and scan workflow state transitions.
7. Add README or developer notes for running the mobile app locally and for expected backend API dependencies.
8. Validate OpenSpec status and run available mobile verification commands.

Rollback is simple for this course project: remove `apps/checkin-mobile/`, remove mobile package entries from workspace scripts if added, and reinstall dependencies if needed. No database or production migration is required.

## Open Questions

- No blocking open questions. The implementation should use Expo-managed React Native unless an existing team decision has already selected a different React Native setup before `/opsx:apply`.
