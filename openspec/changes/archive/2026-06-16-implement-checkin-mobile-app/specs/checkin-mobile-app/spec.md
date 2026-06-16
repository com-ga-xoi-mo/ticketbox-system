## ADDED Requirements

### Requirement: React Native check-in app workspace

The system SHALL provide a React Native mobile app workspace for check-in staff that can be installed, started, tested, and developed independently from the backend API and worker apps.

#### Scenario: Mobile app workspace is available

- **WHEN** a developer opens the repository after this change is implemented
- **THEN** the repository SHALL contain an `apps/checkin-mobile` workspace with TypeScript source, app entrypoint, package scripts, and local run instructions

#### Scenario: Mobile verification can run

- **WHEN** a developer runs the documented mobile verification command
- **THEN** the command SHALL verify the mobile app foundation without requiring the backend check-in API to be implemented

### Requirement: Check-in staff mobile session

The mobile app SHALL allow check-in staff to log in, persist a JWT bearer-token session through a replaceable mobile session store, restore the session on app restart, and log out.

#### Scenario: Staff logs in successfully

- **WHEN** a check-in staff user submits valid credentials and the auth API returns a JWT access token with staff profile data
- **THEN** the app SHALL store the session through the session store and send later API requests with `Authorization: Bearer <token>`

#### Scenario: Staff session is restored

- **WHEN** the app starts and a valid saved session exists in the session store
- **THEN** the app SHALL restore the authenticated staff state without requiring another login

#### Scenario: Staff logs out

- **WHEN** staff chooses to log out
- **THEN** the app SHALL clear the saved session and return to the unauthenticated state

#### Scenario: Non-staff login is blocked from scanning

- **WHEN** a logged-in user profile does not include the `CHECKIN_STAFF` role
- **THEN** the app SHALL prevent access to scanning workflows and show an authorization-blocked state

### Requirement: Staff assignment loading

The mobile app SHALL load active check-in staff assignments after login or session restore and require a selected active assignment before online scan submission.

#### Scenario: Assignments load successfully

- **WHEN** an authenticated check-in staff session is available
- **THEN** the app SHALL request the staff user's active concert or gate assignments using the authenticated API client

#### Scenario: Assignment is selected for scanning

- **WHEN** active assignments are returned
- **THEN** the app SHALL allow staff to select an active assignment as the scan context

#### Scenario: No active assignments blocks scanning

- **WHEN** the assignment API returns no active assignments
- **THEN** the app SHALL show an empty-assignment state and SHALL NOT allow online scan submission

#### Scenario: Assignment loading failure is visible

- **WHEN** assignment loading fails because of a network or authorization error
- **THEN** the app SHALL show a recoverable error state without clearing a still-valid local session

### Requirement: QR scan UI foundation

The mobile app SHALL provide a QR scan UI foundation that can accept decoded QR payloads, prevent duplicate local submissions while one scan is in flight, and render clear scan result states.

#### Scenario: Scanner opens with selected assignment

- **WHEN** staff opens the scanner with an active selected assignment
- **THEN** the app SHALL show the scanner-ready state for that assignment

#### Scenario: Decoded QR starts online submission

- **WHEN** the scanner receives a decoded QR payload while no scan submission is in flight
- **THEN** the app SHALL create an online scan request containing the selected assignment, concert context, QR payload, device ID, and scan timestamp

#### Scenario: Duplicate local decode is ignored while submitting

- **WHEN** another QR decode event fires while the previous scan submission is still in flight
- **THEN** the app SHALL ignore or debounce the repeated decode event until the current submission finishes

#### Scenario: Scan result is displayed

- **WHEN** the check-in API client returns accepted, duplicate, invalid, unauthorized, unassigned, or network-error result
- **THEN** the app SHALL render the corresponding result state for staff

### Requirement: Check-in API integration boundary

The mobile app SHALL route auth, assignment, and online scan operations through typed API client interfaces so backend endpoint implementation can be supplied by related changes without rewriting mobile UI workflow code.

#### Scenario: Authenticated requests include bearer token

- **WHEN** the assignment or online scan client sends an authenticated request
- **THEN** the request SHALL include the current JWT access token as a bearer token

#### Scenario: Online scan endpoint is unavailable

- **WHEN** the future online scan endpoint is unavailable or returns a network failure
- **THEN** the app SHALL show a network or unavailable state and SHALL NOT mark the ticket as accepted locally

#### Scenario: Fake client can verify workflow

- **WHEN** mobile tests inject a fake check-in API client
- **THEN** the scan workflow SHALL be testable without requiring the backend check-in API implementation

#### Scenario: Offline sync is not claimed complete

- **WHEN** the mobile app foundation is implemented
- **THEN** the app SHALL NOT claim offline scan queue, batch sync, or conflict resolution is complete until the later offline sync change implements those behaviors

#### Scenario: QR payload validation stays server-side

- **WHEN** the mobile scanner decodes a QR payload
- **THEN** the app SHALL send the payload to the check-in API without locally deciding ticket validity, concert match, duplicate status, or staff assignment authorization
