## ADDED Requirements

### Requirement: Concert administration ownership enforcement
The system SHALL require organizer ownership or explicit admin authorization for protected concert administration actions, including concert details, ticket types, seating assets, revenue views, and check-in staff assignment management for the concert.

#### Scenario: Owner updates concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert they created
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Non-owner organizer cannot update concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert created by another organizer
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Admin can administer any concert through admin route
- **WHEN** an authenticated admin updates administration data for any concert through an admin-authorized route
- **THEN** the system SHALL authorize the action before applying validation and persistence
