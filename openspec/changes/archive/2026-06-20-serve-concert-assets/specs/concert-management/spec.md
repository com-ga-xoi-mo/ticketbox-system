## ADDED Requirements

### Requirement: Public concert asset serving by id
The system SHALL expose a public endpoint `GET /assets/:id` that streams the binary content of an active concert poster or seating-map asset, resolving the asset by id and fetching its bytes from the shared `ObjectStoragePort`.

#### Scenario: Active poster asset is served
- **WHEN** a client requests `GET /assets/:id` for an existing `ACTIVE` asset whose kind is `POSTER`
- **THEN** the system SHALL stream the asset bytes from `ObjectStoragePort` with the `Content-Type` set to the asset's stored content type

#### Scenario: Active seating-map asset is served
- **WHEN** a client requests `GET /assets/:id` for an existing `ACTIVE` asset whose kind is `SEATING_MAP`
- **THEN** the system SHALL stream the asset bytes from `ObjectStoragePort` with the `Content-Type` set to the asset's stored content type

#### Scenario: No authentication is required
- **WHEN** an unauthenticated client requests `GET /assets/:id` for a servable asset
- **THEN** the system SHALL serve the asset bytes without requiring a JWT or any role

#### Scenario: Response is cacheable
- **WHEN** the system serves a servable asset
- **THEN** the response SHALL include a `Cache-Control` header marking the content as publicly cacheable, because an asset id maps to immutable content

### Requirement: Concert asset serving scope and not-found handling
The system SHALL only serve assets whose kind is `POSTER` or `SEATING_MAP` and SHALL return a `404` response for any request that cannot be served, without revealing whether an id exists.

#### Scenario: Unknown asset id returns 404
- **WHEN** a client requests `GET /assets/:id` for an id that has no matching `Asset` row
- **THEN** the system SHALL respond with `404`

#### Scenario: Archived asset returns 404
- **WHEN** a client requests `GET /assets/:id` for an asset whose status is `ARCHIVED`
- **THEN** the system SHALL respond with `404` and SHALL NOT stream any bytes

#### Scenario: Out-of-scope asset kind returns 404
- **WHEN** a client requests `GET /assets/:id` for an existing asset whose kind is neither `POSTER` nor `SEATING_MAP`
- **THEN** the system SHALL respond with `404` and SHALL NOT stream any bytes

#### Scenario: Missing storage object returns 404
- **WHEN** a servable asset row exists but its underlying object is missing from `ObjectStoragePort`
- **THEN** the system SHALL respond with `404`
