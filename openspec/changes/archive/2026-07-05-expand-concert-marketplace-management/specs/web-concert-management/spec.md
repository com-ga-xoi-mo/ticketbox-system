## ADDED Requirements

### Requirement: Marketplace concert authoring fields
The web management app SHALL let organizers and admins edit event type, ordered artists, banner, and SEO metadata while rendering featured placement only to admins.

#### Scenario: Organizer edits marketplace content
- **WHEN** an organizer opens create/edit for an owned editable concert
- **THEN** the form SHALL show event type, artist selection/order, banner, and SEO controls
- **AND** it SHALL NOT render featured or display-order controls

#### Scenario: Admin edits moderation fields
- **WHEN** an admin edits a concert
- **THEN** the form SHALL show featured toggle and non-negative display-order input in addition to marketplace content fields

#### Scenario: Event type is selected from canonical values
- **WHEN** a user edits event type
- **THEN** the UI SHALL offer only CONCERT, WORKSHOP, SPORT, MOVIE, THEATRE, and VOUCHER with understandable labels

#### Scenario: Management surfaces display marketplace metadata
- **WHEN** concert list or detail data contains event type, ordered artists, poster, or banner metadata
- **THEN** the management UI SHALL display the relevant values and resolve asset `publicUrl` before falling back to `/assets/:id`

### Requirement: Accessible ordered artist selector
The concert form SHALL provide an asynchronous multi-select over existing active artists and SHALL let users establish a deterministic primary and display order without creating artists inline.

#### Scenario: User searches active artists
- **WHEN** a user types a search query in the selector
- **THEN** the web app SHALL debounce `GET /public/artists?q=&limit=&offset=`, show matching active artists with avatar and name, and prevent duplicate selection
- **AND** it SHALL NOT introduce a separate organizer artist-search endpoint

#### Scenario: Selected artists are ordered accessibly
- **WHEN** multiple artists are selected
- **THEN** the UI SHALL label the first as primary and provide keyboard-operable move-up and move-down controls
- **AND** any drag-and-drop interaction SHALL not be the only ordering mechanism

#### Scenario: Existing inactive artist is visible
- **WHEN** management data contains an already-linked inactive artist
- **THEN** the selector SHALL display it with an inactive warning and allow retaining or removing it
- **AND** it SHALL not offer unrelated inactive artists as new selections

#### Scenario: Organizer cannot create artist inline
- **WHEN** an organizer search has no result
- **THEN** the selector SHALL show an empty result and SHALL NOT offer artist creation

#### Scenario: Link save fails after draft creation
- **WHEN** base concert creation succeeds but the artist replacement request fails
- **THEN** the UI SHALL keep the created DRAFT and current selections on the edit route, show a retryable error, and SHALL NOT publish the concert

#### Scenario: Primary artist owns the legacy name
- **WHEN** the form contains one or more selected artists
- **THEN** it SHALL derive the base `artistName` from the selected primary artist, save base metadata first, and replace artists second
- **AND** an edit form with linked artists SHALL render legacy `artistName` as derived/read-only so base metadata updates cannot overwrite synchronization

#### Scenario: Unlinked concert retains manual artist name
- **WHEN** a concert has no linked artists
- **THEN** the form SHALL keep manual `artistName` required and editable for compatibility
- **AND** clearing all links SHALL preserve the last legacy name and re-enable manual editing on the next unlinked edit

### Requirement: Banner and SEO management UI
The concert form SHALL provide banner upload/preview and nullable SEO fields with client validation compatible with backend contracts.

#### Scenario: Banner preview uses public URL
- **WHEN** a concert has banner metadata with a non-empty public URL
- **THEN** the form SHALL preview that URL and fall back to `/assets/:id` only if it is absent

#### Scenario: User replaces banner
- **WHEN** an authorized user selects a valid banner and confirms upload
- **THEN** the UI SHALL show upload progress, prevent duplicate submission, refresh concert data, and display the new preview

#### Scenario: Invalid SEO image URL is shown locally
- **WHEN** a user enters a non-empty SEO image URL that is not absolute HTTPS
- **THEN** the form SHALL show a field-level error and SHALL NOT submit until corrected or cleared

### Requirement: Admin artist catalog UI
The admin web app SHALL expose `/admin/artists` for paginated artist search, status filtering, create/edit, and avatar/poster management.

#### Scenario: Admin searches all artist statuses
- **WHEN** an admin opens the artist catalog and searches or filters by status
- **THEN** the UI SHALL request protected paginated data and display ACTIVE and INACTIVE artists with safe image metadata

#### Scenario: Admin creates or edits artist
- **WHEN** an admin submits valid slug, display name, optional bio, and status
- **THEN** the UI SHALL call the canonical admin contract, refresh affected queries, and show validation or conflict errors safely

#### Scenario: Admin uploads artist images
- **WHEN** an admin uploads a valid avatar or poster
- **THEN** the UI SHALL prevent duplicate upload, refresh artist data, and resolve the returned public URL

#### Scenario: Organizer cannot access artist catalog
- **WHEN** an organizer navigates to `/admin/artists` or calls admin artist APIs
- **THEN** existing route and backend role guards SHALL deny access

### Requirement: Marketplace management UI state safety
The web app SHALL preserve unsaved marketplace selections and avoid stale query data across role-specific mutations.

#### Scenario: Mutation invalidates role-scoped concert queries
- **WHEN** event type, SEO, artists, banner, or featured placement changes successfully
- **THEN** the web app SHALL invalidate the relevant role-specific list/detail queries without crossing admin and organizer cache namespaces

#### Scenario: Failed mutation preserves form state
- **WHEN** a marketplace mutation fails
- **THEN** the UI SHALL retain user-entered values, show a safe actionable error, and avoid displaying raw backend payloads
