## ADDED Requirements

### Requirement: Public concert responses include linked artists
The system SHALL include an optional `artists` array in public concert list and detail responses, containing summary data for each artist linked to the concert via `ConcertArtist`, ordered by `displayOrder`.

#### Scenario: Public concert detail includes linked artists
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has linked artists
- **THEN** the system SHALL include an `artists` array in the response, where each item contains the artist's `id`, `slug`, `displayName`, and `avatarAsset` metadata, ordered by `displayOrder`

#### Scenario: Public concert detail with no linked artists returns empty array
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has no linked artists
- **THEN** the system SHALL include an empty `artists` array in the response

#### Scenario: Public concert list includes linked artists
- **WHEN** an audience user opens the public concert list
- **THEN** each concert summary SHALL include an `artists` array containing linked artist summaries ordered by `displayOrder`

#### Scenario: Inactive artists are excluded from public concert responses
- **WHEN** a concert is linked to an artist with status INACTIVE
- **THEN** the public concert response SHALL exclude that artist from the `artists` array

#### Scenario: Existing artistName field remains unchanged
- **WHEN** a public concert response includes linked artists in the `artists` array
- **THEN** the response SHALL continue to include the existing `artistName` string field with its original value

### Requirement: Concert artist linking management endpoints
The system SHALL allow organizers and admins to set the list of artists linked to a concert through protected endpoints, using replace semantics. Organizer endpoints SHALL enforce ownership. Admin endpoints SHALL allow any concert.

#### Scenario: Organizer sets artist list for owned concert
- **WHEN** an authenticated organizer submits `PUT /organizer/concerts/:id/artists` with a list of artist IDs and display orders for a concert they own
- **THEN** the system SHALL replace all existing `ConcertArtist` records for that concert with the submitted list

#### Scenario: Admin sets artist list for any concert
- **WHEN** an authenticated admin submits `PUT /admin/concerts/:id/artists` with a list of artist IDs and display orders
- **THEN** the system SHALL replace all existing `ConcertArtist` records for that concert with the submitted list regardless of ownership

#### Scenario: Organizer cannot set artists for non-owned concert
- **WHEN** an authenticated organizer submits `PUT /organizer/concerts/:id/artists` for a concert they do not own
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Empty artist list clears all concert artists
- **WHEN** an authorized user submits an empty artist list via the concert artist linking endpoint
- **THEN** the system SHALL remove all `ConcertArtist` records for that concert without affecting `Concert.artistName`

#### Scenario: Non-existent artist ID in list is rejected
- **WHEN** an authorized user submits an artist list containing an artist ID that does not exist in the database
- **THEN** the system SHALL reject the entire request with a validation error without partial application
