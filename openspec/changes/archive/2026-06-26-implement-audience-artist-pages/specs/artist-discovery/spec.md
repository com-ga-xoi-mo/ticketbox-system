## ADDED Requirements

### Requirement: Frontend consumption of public artist APIs
The artist discovery backend APIs SHALL be consumed by the audience web app for artist list, artist profile, and top artists display. This requirement documents the frontend consumption contract to ensure backend and frontend remain aligned.

#### Scenario: Audience web app consumes artist list endpoint
- **WHEN** the audience web app renders the artist list page
- **THEN** it SHALL call `GET /public/artists` with optional `q`, `limit`, and `offset` query parameters
- **AND** the response SHALL conform to `PublicArtistListResponseSchema` from `@ticketbox/api-types`

#### Scenario: Audience web app consumes artist profile endpoint
- **WHEN** the audience web app renders an artist profile page
- **THEN** it SHALL call `GET /public/artists/:slug`
- **AND** the response SHALL conform to `PublicArtistProfileSchema` from `@ticketbox/api-types`
- **AND** when the request includes a valid AUDIENCE bearer token, the response SHALL include `viewerFollowing` and `viewerFavorited` as booleans

#### Scenario: Audience web app consumes top artists endpoint
- **WHEN** the audience web app renders the homepage top artists rail
- **THEN** it SHALL call `GET /public/artists/top`
- **AND** the response SHALL conform to `TopArtistListResponseSchema` from `@ticketbox/api-types`

#### Scenario: Audience web app consumes follow/favorite endpoints
- **WHEN** an authenticated AUDIENCE user triggers a follow or favorite action in the audience web app
- **THEN** the app SHALL call the appropriate `POST /audience/artists/:id/follow`, `DELETE /audience/artists/:id/follow`, `POST /audience/artists/:id/favorite`, or `DELETE /audience/artists/:id/favorite` endpoint
- **AND** the response SHALL conform to `ArtistFollowResponseSchema` or `ArtistFavoriteResponseSchema` from `@ticketbox/api-types`

#### Scenario: Unauthenticated artist profile request receives null viewer state
- **WHEN** the audience web app requests an artist profile without authentication
- **THEN** the backend SHALL return `viewerFollowing: null` and `viewerFavorited: null`
- **AND** the frontend SHALL treat null values as "not engaged" for display purposes
