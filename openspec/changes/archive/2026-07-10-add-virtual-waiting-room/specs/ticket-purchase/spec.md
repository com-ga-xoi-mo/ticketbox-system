## ADDED Requirements

### Requirement: Checkout requires an admission token when the waiting room is active
The system SHALL require a valid admission token, bound to the requesting user and the concert, before creating a direct-purchase order when that concert's virtual waiting room is active. The client SHALL pass the token in the create-order request body as `waitingRoomAdmissionToken`. The admission check SHALL run before the inventory reservation transaction and SHALL NOT change the reservation transaction itself. When the concert's waiting room is inactive, checkout SHALL NOT require an admission token and SHALL behave as it does today. On successful order creation the admission slot SHALL be released so the next waiting user can be admitted.

#### Scenario: Admitted user checks out while the room is active
- **WHEN** an authenticated AUDIENCE user submits `POST /checkout/orders` for a concert whose waiting room is active, carrying a valid admission token bound to that user and concert
- **THEN** the system SHALL allow the existing reservation transaction to run
- **AND** the system SHALL release the user's admission slot after the order is created

#### Scenario: Duplicate checkout retry returns existing order without requiring a new admission
- **WHEN** an authenticated AUDIENCE user retries `POST /checkout/orders` with the same idempotency key after an order was already created for that user
- **THEN** the system SHALL return the existing order
- **AND** it SHALL NOT require a fresh waiting-room admission token for that duplicate retry

#### Scenario: Missing admission token is rejected while the room is active
- **WHEN** an authenticated AUDIENCE user submits checkout for a concert whose waiting room is active without a valid admission token
- **THEN** the system SHALL reject the request before creating an order or reserving inventory and SHALL direct the client to the waiting queue

#### Scenario: Admission token for another user or concert is rejected
- **WHEN** a checkout request presents an admission token bound to a different user or a different concert
- **THEN** the system SHALL reject the request before creating an order or reserving inventory

#### Scenario: Checkout is unaffected when the room is inactive
- **WHEN** a user submits checkout for a concert whose waiting room is inactive
- **THEN** the system SHALL NOT require an admission token and checkout SHALL behave according to the existing reservation and per-user limit requirements

#### Scenario: Redis waiting-room failure fails open by default
- **WHEN** the waiting-room active state cannot be read from Redis during checkout and fail-open is enabled
- **THEN** the system SHALL allow checkout to continue without a waiting-room admission token
- **AND** it SHALL record the fail-open event for operations visibility

#### Scenario: Checkout attempts feed waiting-room load
- **WHEN** a user attempts direct checkout for a concert
- **THEN** the system SHALL increment that concert's waiting-room load counter before evaluating auto-activation

#### Scenario: Admission control does not change the no-oversell transaction
- **WHEN** the admission token is validated
- **THEN** the validation SHALL occur outside the inventory reservation transaction and SHALL NOT alter `reserved_quantity` or `sold_quantity`

#### Scenario: Admission composes with entitlement gating
- **WHEN** a concert's waiting room is active and a requested ticket type is also gated by a waitlist or lottery entitlement
- **THEN** the system SHALL require both a valid admission token to enter checkout and a valid purchase entitlement to buy the gated ticket type
