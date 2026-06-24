## ADDED Requirements

### Requirement: SVG element ID extraction on upload
The system SHALL parse the sanitized SVG content during seating map upload and extract all element `id` attributes from shape and group elements. The extracted IDs SHALL be persisted in `Asset.metadata` as `{ svgElementIds: string[] }` for downstream validation.

#### Scenario: SVG with identifiable elements stores extracted IDs
- **WHEN** an organizer uploads a valid SVG seating map containing elements with `id` attributes (e.g., `<g id="zone-a">`, `<path id="zone-b">`)
- **THEN** the system SHALL extract all element IDs, persist them in the created Asset's `metadata.svgElementIds` array, and return the asset with metadata populated

#### Scenario: SVG with no identifiable elements stores empty ID list
- **WHEN** an organizer uploads a valid SVG seating map with no elements containing `id` attributes
- **THEN** the system SHALL persist `metadata.svgElementIds` as an empty array
- **AND** the upload SHALL succeed (zones simply cannot be created until elements with IDs exist in the SVG)

#### Scenario: Extracted IDs exclude non-shape elements
- **WHEN** an organizer uploads an SVG that contains `id` attributes on non-renderable elements such as `<defs>`, `<linearGradient>`, or `<clipPath>`
- **THEN** the system SHALL include those IDs in the extracted set because the organizer may use any element as a zone anchor

### Requirement: SVG element ID validation on zone upsert
The system SHALL validate that every `svgElementId` submitted in a zone upsert request exists in the concert's uploaded SVG element ID set before persisting.

#### Scenario: Zone upsert with valid svgElementIds succeeds
- **WHEN** an organizer submits a zone upsert request where all `svgElementId` values exist in the concert's seating map asset `metadata.svgElementIds`
- **THEN** the system SHALL proceed with the upsert operation

#### Scenario: Zone upsert with invalid svgElementId is rejected
- **WHEN** an organizer submits a zone upsert request containing a `svgElementId` that does not exist in the concert's seating map asset `metadata.svgElementIds`
- **THEN** the system SHALL reject the entire request with a validation error identifying the invalid IDs

#### Scenario: Zone upsert when concert has no seating map is rejected
- **WHEN** an organizer submits a zone upsert request for a concert that has no `seatingMapAssetId`
- **THEN** the system SHALL reject the request with an error indicating that a seating map must be uploaded first

### Requirement: Zone reset on seating map re-upload
The system SHALL delete all existing seating zones for a concert when a new seating map SVG replaces the previous one, within the same database transaction that swaps the asset.

#### Scenario: Re-upload deletes all existing zones
- **WHEN** an organizer uploads a new SVG seating map for a concert that already has zones configured
- **THEN** the system SHALL delete all `SeatingZone` rows for that concert within the asset-swap transaction
- **AND** `TicketTypeZone` rows SHALL be removed automatically via cascade delete
- **AND** `TicketType` rows SHALL be preserved

#### Scenario: First-time upload does not trigger zone deletion
- **WHEN** an organizer uploads an SVG seating map for a concert that has no previous seating map
- **THEN** the system SHALL NOT attempt zone deletion (there are no zones to delete)
- **AND** the upload SHALL proceed normally

### Requirement: Allowlist SVG sanitization
The system SHALL sanitize uploaded SVG content using an allowlist of permitted tags and attributes, stripping all disallowed content before storage. The sanitized version SHALL be stored instead of the raw upload.

#### Scenario: Safe SVG passes through sanitizer unchanged
- **WHEN** an organizer uploads an SVG containing only allowed tags (`svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `defs`, `use`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `stop`, `title`, `desc`) and allowed attributes
- **THEN** the system SHALL store the SVG with its content preserved

#### Scenario: SVG with script tags has them stripped
- **WHEN** an organizer uploads an SVG containing `<script>` tags
- **THEN** the system SHALL remove the script elements and store the sanitized SVG

#### Scenario: SVG with event handlers has them stripped
- **WHEN** an organizer uploads an SVG with event handler attributes (e.g., `onclick`, `onload`, `onmouseover`)
- **THEN** the system SHALL remove the event handler attributes and store the sanitized SVG

#### Scenario: SVG with external references has them stripped
- **WHEN** an organizer uploads an SVG with `<foreignObject>`, `<iframe>`, `<embed>`, `<object>` tags or `href`/`xlink:href` attributes pointing to external URLs (`http:`, `//`, `data:`)
- **THEN** the system SHALL remove those elements and attributes and store the sanitized SVG

#### Scenario: Local fragment references are preserved
- **WHEN** an organizer uploads an SVG using local fragment references such as `<use href="#zone-a">` or `clip-path="url(#clip-1)"`
- **THEN** the sanitizer SHALL preserve the `href`/`xlink:href` and `url(#...)` references because they point to elements within the same document (no external fetch)

#### Scenario: Element id attributes are preserved after sanitization
- **WHEN** an organizer uploads an SVG with `id` attributes on shape or group elements
- **THEN** the sanitizer SHALL preserve all `id` attributes so they remain available for zone mapping

#### Scenario: Sanitizer returns list of removed content
- **WHEN** an SVG has unsafe content stripped during sanitization
- **THEN** the system SHALL include a list of removed element types or attribute names in the upload response for transparency

### Requirement: Draft-only guard for seating setup
The system SHALL restrict seating map upload and seating zone configuration to concerts in DRAFT status only.

#### Scenario: SVG upload on DRAFT concert succeeds
- **WHEN** an organizer uploads an SVG seating map for a concert in DRAFT status
- **THEN** the system SHALL accept and process the upload

#### Scenario: SVG upload on PUBLISHED concert is rejected
- **WHEN** an organizer attempts to upload an SVG seating map for a concert in PUBLISHED status
- **THEN** the system SHALL reject the request with an error indicating that seating setup is only allowed for draft concerts

#### Scenario: SVG upload on CANCELLED concert is rejected
- **WHEN** an organizer attempts to upload an SVG seating map for a concert in CANCELLED status
- **THEN** the system SHALL reject the request with an error indicating that seating setup is only allowed for draft concerts

#### Scenario: SVG upload on ENDED concert is rejected
- **WHEN** an organizer attempts to upload an SVG seating map for a concert in ENDED status
- **THEN** the system SHALL reject the request with an error indicating that seating setup is only allowed for draft concerts

#### Scenario: Zone PATCH on DRAFT concert succeeds
- **WHEN** an organizer submits a zone upsert request for a concert in DRAFT status
- **THEN** the system SHALL accept and process the zone upsert

#### Scenario: Zone PATCH on non-DRAFT concert is rejected
- **WHEN** an organizer submits a zone upsert request for a concert in PUBLISHED, CANCELLED, or ENDED status
- **THEN** the system SHALL reject the request with an error indicating that seating setup is only allowed for draft concerts

#### Scenario: Draft-only guard applies to admins too
- **WHEN** an admin (with `allowAdminOverride`) uploads a seating map SVG or submits a zone upsert for a concert that is not in DRAFT status
- **THEN** the system SHALL reject the request the same way as for an organizer — `allowAdminOverride` bypasses ownership checks only, never the draft-only lifecycle guard
