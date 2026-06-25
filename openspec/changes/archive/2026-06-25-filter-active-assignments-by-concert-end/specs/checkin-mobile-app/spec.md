## MODIFIED Requirements

### Requirement: Checkin staff active assignment query

The Checkin bounded context SHALL expose `GET /checkin/assignments` for authenticated `CHECKIN_STAFF` users to list their own active concert and gate assignments using the shared assignment response contract. The listing SHALL include only assignments whose concert has not yet ended beyond a grace window, and SHALL order results by concert start time (soonest first).

#### Scenario: Staff lists own active assignments

- **WHEN** an authenticated `CHECKIN_STAFF` user calls `GET /checkin/assignments`
- **THEN** the system SHALL derive the staff identity from the verified JWT and return only that user's active assignments as a raw JSON array with assignment ID, concert ID, concert title, optional gate, optional start time, and `ACTIVE` status

#### Scenario: Assignments for ended concerts are excluded

- **WHEN** an authenticated `CHECKIN_STAFF` user has an `ACTIVE` assignment whose concert ended more than the grace window ago
- **THEN** `GET /checkin/assignments` SHALL NOT return that assignment, even though its stored status remains `ACTIVE`

#### Scenario: Recently ended concert stays within the grace window

- **WHEN** a concert ended less than the grace window ago (default 6 hours after `endsAt`)
- **THEN** the staff's `ACTIVE` assignment for that concert SHALL still be returned so late check-in can continue

#### Scenario: Results are ordered by concert start time

- **WHEN** the staff has multiple eligible active assignments
- **THEN** `GET /checkin/assignments` SHALL order them by concert start time ascending so the first element is the soonest live or upcoming concert

#### Scenario: Empty assignment result preserves raw-array compatibility

- **WHEN** the authenticated staff user has no eligible active assignments
- **THEN** `GET /checkin/assignments` SHALL return `[]` and SHALL NOT wrap the result in an envelope such as `{ assignments: [] }`

#### Scenario: Client cannot select another staff identity

- **WHEN** a caller requests active assignments
- **THEN** the endpoint SHALL NOT accept a client-supplied staff user ID and SHALL NOT return another staff member's assignments

#### Scenario: Missing or invalid token is rejected for assignment listing

- **WHEN** a request to `GET /checkin/assignments` has no valid bearer token
- **THEN** the system SHALL reject the request with HTTP `401` and SHALL NOT return assignment data

#### Scenario: Non-staff user is rejected for assignment listing

- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `GET /checkin/assignments`
- **THEN** the system SHALL reject the request with HTTP `403` and SHALL NOT change existing assignment authorization rules

#### Scenario: Assignment list does not authorize a later scan by itself

- **WHEN** staff submits an online scan after selecting an assignment returned by the list endpoint
- **THEN** the system SHALL still enforce current assignment ownership, active status, concert, and gate checks during scan processing
