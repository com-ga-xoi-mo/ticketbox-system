## MODIFIED Requirements

### Requirement: Public URL Construction
The system SHALL provide a method to construct the public URL for a stored object. For the S3
adapter, the public URL SHALL be `{S3_PUBLIC_BASE_URL}/{key}`. For the local adapter, the public URL
SHALL be `{LOCAL_STORAGE_PUBLIC_BASE_URL}/{key}` (configurable, defaulting to
`http://localhost:3000/storage`). In production, public asset metadata SHALL use this URL as the
primary client-facing delivery path for stored poster and seating map assets.

#### Scenario: S3 public URL construction
- **WHEN** `getPublicUrl("seating-maps/uuid/map.svg")` is called on the S3 adapter
- **AND** `S3_PUBLIC_BASE_URL` is `https://assets.ticketbox.example.com`
- **THEN** it SHALL return `https://assets.ticketbox.example.com/seating-maps/uuid/map.svg`

#### Scenario: Local public URL construction
- **WHEN** `getPublicUrl("artist-bios/uuid/press-kit.pdf")` is called on the local adapter
- **THEN** it SHALL return `http://localhost:3000/storage/artist-bios/uuid/press-kit.pdf`

#### Scenario: Production catalog uses public object URL
- **WHEN** a poster or seating map asset is uploaded while `STORAGE_DRIVER=s3`
- **THEN** the persisted asset `publicUrl` SHALL be derived from `S3_PUBLIC_BASE_URL`
- **AND** public catalog clients SHALL be able to use that URL directly without requesting a separate image URL endpoint
