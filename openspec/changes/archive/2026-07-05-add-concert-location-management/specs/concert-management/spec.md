## ADDED Requirements

### Requirement: Concert venue coordinates
The system SHALL persist `latitude` and `longitude` as nullable `Decimal(9,6)` fields on the `Concert` table. Both fields SHALL be stored and updated together: a request providing only one coordinate SHALL be rejected. Both fields being null is valid and represents a concert with no location set. Latitude SHALL be validated in the range [-90, 90] and longitude in the range [-180, 180] by the backend before persisting.

#### Scenario: Organizer creates concert with coordinates
- **WHEN** an organizer creates a concert with valid `latitude` and `longitude`
- **THEN** the system SHALL persist both coordinates and return them in the management response

#### Scenario: Organizer creates concert without coordinates
- **WHEN** an organizer creates a concert without `latitude` or `longitude`
- **THEN** the system SHALL persist the concert with both fields null and return them as null

#### Scenario: Location support does not grant admin concert creation
- **WHEN** an admin uses concert management after this change
- **THEN** the admin SHALL be able to update coordinates on existing concerts under existing admin permissions
- **AND** this change SHALL NOT grant or expose a concert-create action to admins

#### Scenario: Existing accidental admin create endpoint is removed
- **WHEN** the location-management baseline is reconciled with the main concert-management specification
- **THEN** `POST /admin/concerts` and its admin-create shared contract SHALL no longer be exposed
- **AND** organizer concert creation and admin concert editing SHALL continue to work

#### Scenario: Update concert coordinates
- **WHEN** an organizer or admin sends an update request with valid `latitude` and `longitude`
- **THEN** the system SHALL update both coordinate fields

#### Scenario: Clear concert coordinates
- **WHEN** an organizer or admin sends an update request with both `latitude` and `longitude` as null
- **THEN** the system SHALL set both coordinate fields to null

#### Scenario: Update without coordinate fields preserves existing coordinates
- **WHEN** an organizer or admin sends an update request that omits `latitude` and `longitude`
- **THEN** the system SHALL leave the existing coordinate values unchanged

#### Scenario: Only latitude provided is rejected
- **WHEN** an organizer or admin sends a request with `latitude` set but `longitude` absent or null
- **THEN** the system SHALL return HTTP 400

#### Scenario: Only longitude provided is rejected
- **WHEN** an organizer or admin sends a request with `longitude` set but `latitude` absent or null
- **THEN** the system SHALL return HTTP 400

#### Scenario: Latitude out of range is rejected
- **WHEN** an organizer or admin sends a request with `latitude` outside [-90, 90]
- **THEN** the system SHALL return HTTP 400

#### Scenario: Longitude out of range is rejected
- **WHEN** an organizer or admin sends a request with `longitude` outside [-180, 180]
- **THEN** the system SHALL return HTTP 400

#### Scenario: Legacy concert without coordinates remains valid
- **WHEN** a concert that existed before the migration is read via any management or public endpoint
- **THEN** the response SHALL include `latitude: null` and `longitude: null` without error

### Requirement: Public concert detail includes coordinates
The public concert detail response SHALL include `latitude` and `longitude` alongside existing venue fields. When no coordinates are set, both fields SHALL be null.

#### Scenario: Public detail returns coordinates when set
- **WHEN** an audience user requests a published concert detail and the concert has coordinates
- **THEN** the response SHALL include the correct `latitude` and `longitude` values

#### Scenario: Public detail returns null coordinates when unset
- **WHEN** an audience user requests a published concert detail and the concert has no coordinates
- **THEN** the response SHALL include `latitude: null` and `longitude: null`

#### Scenario: Management detail returns coordinates
- **WHEN** an organizer or admin reads a concert they have access to
- **THEN** the management detail response SHALL include `latitude` and `longitude`

#### Scenario: Geocoding result is only a suggestion
- **WHEN** coordinates are saved after a user selects a geocoding result or adjusts a marker
- **THEN** the system SHALL save the user-confirmed coordinates without re-calling the geocoding provider
- **AND** the saved coordinates are not validated against any geocoding provider

#### Scenario: Coordinate mutation invalidates public detail cache
- **WHEN** an organizer or admin updates or clears a concert's coordinates
- **THEN** the affected public concert-detail cache entry SHALL be invalidated before the mutation returns
- **AND** the next public detail read SHALL return the updated coordinate pair
