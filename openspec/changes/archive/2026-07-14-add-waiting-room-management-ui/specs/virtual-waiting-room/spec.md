## MODIFIED Requirements

### Requirement: Per-concert waiting room configuration
The system SHALL allow an authorized organizer to configure a virtual waiting room only for a concert they own and SHALL allow an authenticated admin to configure any concert through the shared waiting-room management endpoints. Configuration includes whether the room is enabled, whether it auto-activates by load, a manual override, the maximum checkout concurrency, the admission-token TTL, load activate/deactivate thresholds, and cooldown seconds. Authorization and target existence SHALL be established before reading or mutating configuration, and a waiting room SHALL default to disabled.

#### Scenario: Organizer configures an owned waiting room
- **WHEN** an authenticated organizer sets waiting-room configuration for a concert whose `createdById` matches their user ID, with a maximum concurrency, admission TTL, and load thresholds
- **THEN** the system SHALL persist the per-concert configuration
- **AND** a concert without configuration SHALL be treated as having its waiting room disabled

#### Scenario: Organizer cannot manage another organizer's waiting room
- **WHEN** an authenticated organizer attempts to GET, PUT, or PATCH waiting-room configuration for a concert they do not own
- **THEN** the system SHALL reject the operation before reading or mutating the configuration
- **AND** the HTTP response SHALL return 403 Forbidden, consistent with the ownership-authorization convention used by other concert-management endpoints

#### Scenario: Admin manages any concert waiting room
- **WHEN** an authenticated admin GETs, PUTs, or PATCHes waiting-room configuration for an existing concert
- **THEN** the system SHALL allow the operation through the same `/organizer/waiting-room/:concertId` endpoint family
- **AND** admin authorization SHALL not depend on concert ownership

#### Scenario: Unknown concert is rejected before persistence
- **WHEN** an authorized actor attempts to configure or override a concert ID that does not exist
- **THEN** the system SHALL return a safe not-found response
- **AND** it SHALL NOT expose a Prisma foreign-key or internal persistence error

#### Scenario: Disabled config is a master off switch
- **WHEN** a waiting-room configuration has `enabled` set to false
- **THEN** the concert's waiting room SHALL be inactive regardless of manual override or measured load

#### Scenario: Invalid configuration is rejected
- **WHEN** a configuration sets a non-positive maximum concurrency or admission TTL, a non-positive activate threshold, a negative deactivate threshold or cooldown, or a deactivate threshold that is not below the activate threshold
- **THEN** the system SHALL reject the configuration
