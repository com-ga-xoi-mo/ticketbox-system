## MODIFIED Requirements

### Requirement: Organizer concert administration

The system SHALL allow authorized organizers to list, read, create, update, publish, and cancel concerts, including assigning poster and seating map assets. Read endpoints scoped to the organizer SHALL include concerts in every status (DRAFT, PUBLISHED, CANCELLED, ENDED), unlike the public catalog which only exposes published, available concerts. Concert slug SHALL be editable through the update endpoint and use the same URL-safe validation as creation.

#### Scenario: Organizer lists their concerts across all statuses

- **WHEN** an authenticated organizer requests `GET /organizer/concerts`
- **THEN** the system SHALL return the concerts created by that organizer, including DRAFT, PUBLISHED, CANCELLED, and ENDED concerts

#### Scenario: Organizer concert list excludes other organizers' concerts

- **WHEN** an authenticated organizer requests `GET /organizer/concerts`
- **THEN** the system SHALL NOT include concerts owned by a different organizer

#### Scenario: Organizer reads a single concert they own

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for a concert they own
- **THEN** the system SHALL return that concert regardless of its status

#### Scenario: Organizer cannot read a concert they do not own

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for a concert owned by another organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Reading a non-existent concert returns not found

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for an id that does not exist
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Organizer creates concert

- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer updates concert details

- **WHEN** an organizer submits updated information, including slug when changed, for a concert they own (DRAFT or PUBLISHED status)
- **THEN** the system SHALL apply the update and return the updated concert

#### Scenario: Organizer cannot update concert to an invalid slug

- **WHEN** an organizer submits a slug that is not URL-safe while updating a concert
- **THEN** the system SHALL reject the update with a validation error

#### Scenario: Organizer cannot update concert to a duplicate slug

- **WHEN** an organizer submits a slug that already belongs to another concert
- **THEN** the system SHALL reject the update with a conflict error

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

#### Scenario: Organizer uploads seating map asset

- **WHEN** an organizer uploads a valid SVG seating map for a concert they manage
- **THEN** the system SHALL store the SVG as an asset and associate it with the concert as its seating map asset

### Requirement: Admin concert administration

The system SHALL allow authorized admins to list, read, and edit all concerts and to moderate them by publishing or cancelling, through admin endpoints. Admin read endpoints SHALL include all concerts in every status (DRAFT, PUBLISHED, CANCELLED, ENDED), regardless of owner. Admins SHALL NOT create concerts; concert creation is reserved for organizers.

#### Scenario: Admin lists all concerts across all statuses

- **WHEN** an authenticated admin requests `GET /admin/concerts`
- **THEN** the system SHALL return all concerts, including DRAFT, PUBLISHED, CANCELLED, and ENDED concerts

#### Scenario: Admin reads any concert

- **WHEN** an authenticated admin requests `GET /admin/concerts/:id` for an existing concert
- **THEN** the system SHALL return that concert regardless of owner or status

#### Scenario: Admin reading a non-existent concert returns not found

- **WHEN** an authenticated admin requests `GET /admin/concerts/:id` for an id that does not exist
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Admin edits a concert

- **WHEN** an authenticated admin submits updated concert metadata (including slug when changed) via the admin update endpoint
- **THEN** the system SHALL apply the update and return the updated concert

#### Scenario: Admin publishes a draft concert

- **WHEN** an authenticated admin publishes a DRAFT concert through the admin endpoint
- **THEN** the system SHALL transition the concert status from DRAFT to PUBLISHED

#### Scenario: Admin cancels a concert

- **WHEN** an authenticated admin cancels a concert through the admin endpoint
- **THEN** the system SHALL mark the concert as CANCELLED
