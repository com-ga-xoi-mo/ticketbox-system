## MODIFIED Requirements

### Requirement: Check-in staff mobile session
The mobile app SHALL allow check-in staff to log in using the shared token-only login contract, load the authenticated staff profile using the shared profile contract, persist the resulting JWT bearer-token session through a replaceable mobile session store, restore the session on app restart, and log out.

#### Scenario: Staff logs in successfully
- **WHEN** a check-in staff user submits valid credentials, `POST /auth/login` returns a JWT access token, and `GET /me/profile` returns a valid staff profile
- **THEN** the app SHALL map the token and profile into its local session, store that session through the session store, and send later API requests with `Authorization: Bearer <token>`

#### Scenario: Invalid profile response prevents session creation
- **WHEN** login returns a token but the authenticated profile response does not satisfy the shared profile schema
- **THEN** the app SHALL NOT create an authenticated local session and SHALL expose a recoverable local error

#### Scenario: Staff session is restored
- **WHEN** the app starts and a valid saved session exists in the session store
- **THEN** the application root SHALL enter a restoring state, invoke the session controller restore operation, restore the authenticated staff state without requiring another login, and load that session's active assignments

#### Scenario: Startup without a saved session remains unauthenticated
- **WHEN** the app starts and the session store contains no valid saved session
- **THEN** the application root SHALL finish restoration in the unauthenticated state and SHALL NOT request staff assignments

#### Scenario: Staff logs out
- **WHEN** staff chooses to log out
- **THEN** the app SHALL clear the saved session and return to the unauthenticated state

#### Scenario: Non-staff login is blocked from scanning
- **WHEN** a loaded user profile does not include the public `CHECKIN_STAFF` role code
- **THEN** the app SHALL prevent access to scanning workflows and show an authorization-blocked state

### Requirement: Staff assignment loading
The mobile app SHALL load the authenticated check-in staff user's active assignments as a raw JSON array from `GET /checkin/assignments` after login or session restore, validate that array using the shared assignment contract, and require a selected active assignment before online scan submission.

#### Scenario: Assignments load successfully
- **WHEN** an authenticated check-in staff session is available
- **THEN** the app SHALL request and validate the staff user's active concert or gate assignments as a raw array using the authenticated API client and SHALL reject an envelope object such as `{ assignments: [...] }`

#### Scenario: Assignment is selected for scanning
- **WHEN** active assignments are returned
- **THEN** the app SHALL allow staff to select an active assignment as the scan context

#### Scenario: No active assignments blocks scanning
- **WHEN** the assignment API returns the raw array `[]`
- **THEN** the app SHALL show an empty-assignment state and SHALL NOT allow online scan submission

#### Scenario: Assignment loading failure is visible
- **WHEN** assignment loading fails because of a network or authorization error
- **THEN** the app SHALL show a recoverable local error state without clearing a still-valid local session

### Requirement: QR scan UI foundation
The mobile app SHALL provide a QR scan UI foundation that can accept decoded QR payloads, prevent duplicate local submissions while one scan is in flight, validate successful API responses using the shared online scan contract, and render clear local scan result states.

#### Scenario: Scanner opens with selected assignment
- **WHEN** staff opens the scanner with an active selected assignment
- **THEN** the app SHALL show the scanner-ready state for that assignment

#### Scenario: Decoded QR starts online submission
- **WHEN** the scanner receives a decoded QR payload while no scan submission is in flight
- **THEN** the app SHALL create a shared online scan request containing the selected assignment, concert context, QR payload, device ID, and scan timestamp

#### Scenario: Stable installation identifier is included
- **WHEN** the app starts or first initializes the scan workflow
- **THEN** the app and scan workflow SHALL begin in `initializing`, await a mobile-local `getOrCreateInstallationId(): Promise<string>` provider backed by Expo SecureStore, enter scanner-ready state only after it resolves, and include the resolved stable non-empty installation-scoped `deviceId` in every online scan request

#### Scenario: Existing installation identifier is reused
- **WHEN** the dedicated SecureStore installation-ID key contains a valid identifier
- **THEN** the provider SHALL return that value unchanged across app restarts and user logout/login without deriving it from a user account or hardware serial number

#### Scenario: Missing installation identifier is created once
- **WHEN** the dedicated SecureStore installation-ID key is missing or contains an invalid value
- **THEN** the provider SHALL create a random UUID, persist it successfully, and return the persisted value without using a fixed fallback constant

#### Scenario: Missing installation identifier blocks submission
- **WHEN** the app cannot read, generate, or persist a valid installation identifier, or initialization has not completed
- **THEN** it SHALL not display scanner-ready state, SHALL disable scan submission, SHALL expose a recoverable local error, and SHALL NOT send an online scan request or mark the ticket accepted locally

#### Scenario: Installation initialization can be retried
- **WHEN** installation-ID initialization previously failed and staff selects the retry action
- **THEN** the app SHALL call the asynchronous scan-workflow initialization again, show `initializing` while it runs, enter `ready` only on success, and SHALL NOT use a state-only reset as the retry operation

#### Scenario: Duplicate local decode is ignored while submitting
- **WHEN** another QR decode event fires while the previous scan submission is still in flight
- **THEN** the app SHALL disable scanner submission and ignore or debounce the repeated decode event until the current submission finishes

#### Scenario: Business scan result is displayed
- **WHEN** the check-in API returns a valid `accepted`, `duplicate`, `invalid`, or `unassigned` business response
- **THEN** the app SHALL map it to the corresponding local result presentation

#### Scenario: Authorization and transport outcomes remain local
- **WHEN** online scan receives HTTP `401` or `403`, a network failure, or an unavailable service response
- **THEN** the app SHALL classify `401`/`403` by HTTP status before success-schema parsing, map the outcome to local `unauthorized`, `network-error`, or `unavailable` state, and SHALL NOT add those values or an authorization error body schema to the shared API business result contract

#### Scenario: Authorization error body is parsed tolerantly
- **WHEN** a `401` or `403` response includes the existing NestJS error body
- **THEN** the mobile client MAY extract optional display text from a `message` string or string array, but the local `unauthorized` mapping SHALL NOT depend on an exact body shape

### Requirement: Check-in API integration boundary
The mobile app SHALL route auth, profile, assignment, and online scan operations through typed API client interfaces that consume `@ticketbox/api-types`, while mobile session storage, transport mapping, and feature/UI states remain local.

#### Scenario: Authenticated requests include bearer token
- **WHEN** the profile, assignment, or online scan client sends an authenticated request
- **THEN** the request SHALL include the current JWT access token as a bearer token

#### Scenario: Online scan endpoint is unavailable
- **WHEN** the online scan endpoint is unavailable or returns a network failure
- **THEN** the app SHALL show a local network or unavailable state and SHALL NOT mark the ticket as accepted locally

#### Scenario: Fake client verifies isolated workflow only
- **WHEN** mobile tests inject a fake check-in API client
- **THEN** those tests SHALL verify isolated mobile workflow behavior but SHALL NOT be treated as proof of backend/mobile contract compatibility

#### Scenario: Offline sync is not claimed complete
- **WHEN** shared online contracts are implemented
- **THEN** the app SHALL NOT claim offline scan queue, batch sync, or conflict resolution is complete until the later offline sync change implements those behaviors

#### Scenario: QR payload validation stays server-side
- **WHEN** the mobile scanner decodes a QR payload
- **THEN** the app SHALL send the payload to the check-in API without locally deciding ticket validity, concert match, duplicate status, or staff assignment authorization
