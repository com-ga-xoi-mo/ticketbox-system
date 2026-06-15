## MODIFIED Requirements

### Requirement: Organizer concert administration
The system SHALL allow authorized organizers to create, update, publish, and cancel concerts. Seating map asset upload is deferred to `implement-seating-map-assets`.

#### Scenario: Organizer creates concert
- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer updates concert details
- **WHEN** an organizer submits updated information for a concert they own (DRAFT or PUBLISHED status)
- **THEN** the system SHALL apply the update and return the updated concert

#### Scenario: Organizer publishes a draft concert
- **WHEN** an organizer requests to publish a draft concert they own
- **THEN** the system SHALL transition the concert status from DRAFT to PUBLISHED

#### Scenario: Organizer cannot publish an already-published concert
- **WHEN** an organizer requests to publish a concert that is already PUBLISHED
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer cancels a published concert
- **WHEN** an organizer cancels a published concert they own
- **THEN** the system SHALL mark the concert as CANCELLED and prevent new ticket purchases

#### Scenario: Organizer cancels a draft concert
- **WHEN** an organizer cancels a draft concert they own
- **THEN** the system SHALL mark the concert as CANCELLED

#### Scenario: Organizer cannot cancel an already-cancelled concert
- **WHEN** an organizer attempts to cancel a concert already in CANCELLED status
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer cannot modify an ENDED concert
- **WHEN** an organizer attempts to update, publish, or cancel a concert in ENDED status
- **THEN** the system SHALL reject the request with a status transition error


### Requirement: Ticket type configuration
The system SHALL allow organizers to configure ticket type code, name, description, price, quantity, sale window, maximum quantity per user, and status per concert. Seating-zone mappings are deferred to `implement-seating-map-assets`.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Organizer configures custom ticket type
- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected — negative price
- **WHEN** an organizer submits a ticket type with a negative price
- **THEN** the system SHALL reject the configuration with a validation error identifying the price field

#### Scenario: Invalid ticket type is rejected — invalid quantity
- **WHEN** an organizer submits a ticket type with a zero or negative quantity
- **THEN** the system SHALL reject the configuration with a validation error identifying the quantity field

#### Scenario: Invalid ticket type is rejected — invalid sale window
- **WHEN** an organizer submits a ticket type where sale end time is not after sale start time
- **THEN** the system SHALL reject the configuration with a validation error identifying the sale window

#### Scenario: Duplicate ticket type code is rejected within a concert
- **WHEN** an organizer creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code with a conflict error

#### Scenario: Same ticket type code is allowed across concerts
- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

#### Scenario: Organizer updates ticket type
- **WHEN** an organizer submits updated fields for a ticket type on a concert they own
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Organizer archives ticket type
- **WHEN** an organizer archives a ticket type on a concert they own and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

### Requirement: Concert administration ownership enforcement
The system SHALL require organizer ownership or explicit admin authorization for protected concert administration actions. Ownership is enforced by reusing the existing `AuthorizeConcertManagementUseCase` from the identity module, which checks `concert.createdById` against the authenticated user and supports `allowAdminOverride` for admin routes.

#### Scenario: Owner updates concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert they created
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Non-owner organizer cannot update concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert created by another organizer
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Admin can administer any concert through admin route
- **WHEN** an authenticated admin updates administration data for any concert through an admin-authorized route
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Unauthenticated request is rejected on protected routes
- **WHEN** an unauthenticated request is sent to any organizer or admin concert administration route
- **THEN** the system SHALL return an unauthorized error without processing the request
