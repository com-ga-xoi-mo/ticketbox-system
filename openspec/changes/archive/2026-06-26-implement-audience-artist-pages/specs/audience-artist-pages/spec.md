## ADDED Requirements

### Requirement: Artist list page with search and pagination
The audience web app SHALL provide a public `/artists` route displaying active artists in a searchable, paginated grid. The page SHALL be accessible to both anonymous and authenticated users.

#### Scenario: Anonymous user browses artist list
- **WHEN** an unauthenticated user navigates to `/artists`
- **THEN** the page SHALL display a grid of artist cards showing each artist's avatar, display name, and favorite count
- **AND** each card SHALL link to the artist's profile page at `/artists/:slug`

#### Scenario: User searches artists by name
- **WHEN** a user types a search term into the artist list search input
- **THEN** the page SHALL filter the artist list to show artists whose display name matches the query (case-insensitive partial match) after a 300ms debounce
- **AND** pagination SHALL reset to page 1

#### Scenario: Search query is reflected in URL
- **WHEN** a user searches for artists with a query term
- **THEN** the URL SHALL update to include `?q=<term>` as a search parameter
- **AND** navigating directly to `/artists?q=<term>` SHALL pre-fill the search input and show filtered results

#### Scenario: Artist list pagination
- **WHEN** the total number of matching artists exceeds the page size
- **THEN** the page SHALL display pagination controls allowing navigation between pages
- **AND** the current page SHALL be reflected in the URL as `?page=N`

#### Scenario: Artist list loading state
- **WHEN** the artist list API request is in progress
- **THEN** the page SHALL display skeleton card placeholders matching the grid layout dimensions

#### Scenario: Artist list empty state
- **WHEN** the artist list API returns zero results (with or without a search query)
- **THEN** the page SHALL display a contextual empty state message
- **AND** if a search query is active, the empty state SHALL suggest clearing the search

#### Scenario: Artist list error state
- **WHEN** the artist list API request fails
- **THEN** the page SHALL display an error message with a retry action

#### Scenario: Authenticated AUDIENCE user sees follow/favorite controls on artist cards
- **WHEN** an authenticated user with the AUDIENCE role views the artist list
- **THEN** each artist card SHALL display follow and favorite toggle controls reflecting the user's current engagement state

#### Scenario: Anonymous user sees engagement signal without controls
- **WHEN** an unauthenticated user views the artist list
- **THEN** each artist card SHALL display the favorite count as a read-only signal
- **AND** follow/favorite toggle controls SHALL NOT be displayed on the cards (engagement actions are available on the profile page with login CTA)

### Requirement: Artist profile page with engagement and timeline
The audience web app SHALL provide a public `/artists/:slug` route displaying a full artist profile with identity, engagement controls, and an event timeline.

#### Scenario: Anonymous user views artist profile
- **WHEN** an unauthenticated user navigates to `/artists/:slug` for an active artist
- **THEN** the page SHALL display the artist's avatar, poster/cover image as hero background, display name, bio (if present), follower count, and favorite count
- **AND** follow and favorite buttons SHALL be visible with a login CTA on click

#### Scenario: Authenticated AUDIENCE user views artist profile with engagement state
- **WHEN** an authenticated AUDIENCE user navigates to `/artists/:slug`
- **THEN** the page SHALL display the artist profile with `viewerFollowing` and `viewerFavorited` states reflected in the follow and favorite button controls

#### Scenario: Artist profile displays upcoming event timeline
- **WHEN** the artist profile response includes upcoming events in the `upcomingEvents` array
- **THEN** the page SHALL display a timeline section with event cards showing each event's poster, title, venue, city, date, and event type
- **AND** each event card SHALL link to the existing audience event detail page at `/events/:slug`

#### Scenario: Artist profile with no upcoming events
- **WHEN** the artist profile response includes an empty `upcomingEvents` array
- **THEN** the timeline section SHALL display an empty state message
- **AND** if `pastEventCount` is greater than zero, the empty state SHALL mention the number of past events

#### Scenario: Artist profile with past event count
- **WHEN** the artist profile response includes a `pastEventCount` greater than zero
- **THEN** the page SHALL display the past event count as informational text (e.g., "N past events")

#### Scenario: Artist poster as hero background
- **WHEN** the artist has a non-null `posterAsset`
- **THEN** the profile hero section SHALL use the poster image as a full-width background with a gradient overlay for text readability

#### Scenario: Artist without poster uses fallback hero
- **WHEN** the artist has a null `posterAsset`
- **THEN** the profile hero section SHALL display a branded gradient background as fallback

#### Scenario: Artist avatar display
- **WHEN** the artist has a non-null `avatarAsset`
- **THEN** the profile SHALL display the avatar as a circular image overlapping the hero banner bottom edge

#### Scenario: Artist without avatar uses fallback
- **WHEN** the artist has a null `avatarAsset`
- **THEN** the profile SHALL display a placeholder avatar with the artist's initials or a default icon

#### Scenario: Artist bio display
- **WHEN** the artist profile has a non-null `bio` field
- **THEN** the page SHALL render the bio text in a dedicated section below the artist identity area
- **AND** the bio text SHALL support multi-paragraph rendering

#### Scenario: Artist without bio hides bio section
- **WHEN** the artist profile has a null `bio` field
- **THEN** the bio section SHALL not be rendered and the layout SHALL not leave an empty gap

#### Scenario: Artist profile not found
- **WHEN** a user navigates to `/artists/:slug` and the API returns 404
- **THEN** the page SHALL display a not-found state with a link back to the artist list at `/artists`

#### Scenario: Artist profile loading state
- **WHEN** the artist profile API request is in progress
- **THEN** the page SHALL display skeleton placeholders for the hero, identity, engagement counts, and timeline sections

#### Scenario: Artist profile error state
- **WHEN** the artist profile API request fails with a non-404 error
- **THEN** the page SHALL display an error message with a retry action

#### Scenario: Artist profile responsive layout on mobile
- **WHEN** the artist profile page is viewed on a mobile viewport (< 768px)
- **THEN** the hero section SHALL stack vertically with reduced height
- **AND** the event timeline SHALL display in a single-column layout

#### Scenario: Artist profile responsive layout on desktop
- **WHEN** the artist profile page is viewed on a desktop viewport (>= 1024px)
- **THEN** the hero section SHALL display full-width with increased height
- **AND** the event timeline SHALL display in a multi-column grid

### Requirement: Follow and favorite UX with auth gating
The audience web app SHALL provide follow and favorite toggle controls for artists that gate engagement actions behind AUDIENCE authentication and use optimistic UI updates.

#### Scenario: Authenticated AUDIENCE user follows an artist
- **WHEN** an authenticated AUDIENCE user clicks the follow button on an artist they are not following
- **THEN** the UI SHALL immediately update to show the "following" state (optimistic)
- **AND** the follower count SHALL increment by 1 optimistically
- **AND** the app SHALL send a follow request to the backend

#### Scenario: Authenticated AUDIENCE user unfollows an artist
- **WHEN** an authenticated AUDIENCE user clicks the follow button on an artist they are currently following
- **THEN** the UI SHALL immediately update to show the "not following" state (optimistic)
- **AND** the follower count SHALL decrement by 1 optimistically
- **AND** the app SHALL send an unfollow request to the backend

#### Scenario: Authenticated AUDIENCE user favorites an artist
- **WHEN** an authenticated AUDIENCE user clicks the favorite button on an artist they have not favorited
- **THEN** the UI SHALL immediately update to show the "favorited" state (optimistic)
- **AND** the favorite count SHALL increment by 1 optimistically
- **AND** the app SHALL send a favorite request to the backend

#### Scenario: Authenticated AUDIENCE user unfavorites an artist
- **WHEN** an authenticated AUDIENCE user clicks the favorite button on an artist they have favorited
- **THEN** the UI SHALL immediately update to show the "not favorited" state (optimistic)
- **AND** the favorite count SHALL decrement by 1 optimistically
- **AND** the app SHALL send an unfavorite request to the backend

#### Scenario: Optimistic update rolls back on mutation failure
- **WHEN** a follow or favorite mutation fails after an optimistic update
- **THEN** the UI SHALL roll back to the previous state (button label, count)
- **AND** the app SHALL display an error notification to the user

#### Scenario: Optimistic update reconciles on mutation success
- **WHEN** a follow or favorite mutation succeeds
- **THEN** the app SHALL invalidate the artist profile query to reconcile with the server state

#### Scenario: In-flight mutation disables the action button
- **WHEN** a follow or favorite mutation is in progress
- **THEN** the corresponding action button SHALL be disabled to prevent duplicate clicks

#### Scenario: Anonymous user clicking follow sees login CTA
- **WHEN** an unauthenticated user clicks the follow button on an artist
- **THEN** the app SHALL navigate to `/login?returnTo=/artists/:slug` to prompt authentication
- **AND** the follow mutation SHALL NOT be fired

#### Scenario: Anonymous user clicking favorite sees login CTA
- **WHEN** an unauthenticated user clicks the favorite button on an artist
- **THEN** the app SHALL navigate to `/login?returnTo=/artists/:slug` to prompt authentication
- **AND** the favorite mutation SHALL NOT be fired

### Requirement: Artist routes are public and lazy-loaded
The audience web app SHALL register artist routes as public (no auth guard) and lazy-load the page components to minimize initial bundle size.

#### Scenario: Artist list route is accessible without auth
- **WHEN** any user (authenticated or not) navigates to `/artists`
- **THEN** the route SHALL render the artist list page without requiring authentication

#### Scenario: Artist profile route is accessible without auth
- **WHEN** any user (authenticated or not) navigates to `/artists/:slug`
- **THEN** the route SHALL render the artist profile page without requiring authentication

#### Scenario: Artist page components are lazy-loaded
- **WHEN** the audience app loads its initial bundle
- **THEN** the artist list and artist profile page components SHALL NOT be included in the initial chunk
- **AND** they SHALL be loaded on-demand when the user navigates to an artist route

#### Scenario: Artist routes render inside public layout
- **WHEN** an artist route is rendered
- **THEN** the page SHALL be wrapped in the existing `PublicLayout` shell with consistent navigation and footer

### Requirement: Artist API client layer
The audience web app SHALL provide a centralized API client layer and TanStack Query hooks for all artist endpoints, consuming `@ticketbox/api-types` contracts exclusively.

#### Scenario: Artist list query hook fetches paginated data
- **WHEN** the `useArtists` hook is called with optional search and pagination parameters
- **THEN** it SHALL fetch data from `GET /public/artists` with the provided query parameters
- **AND** the response SHALL be typed as `PublicArtistListResponse` from `@ticketbox/api-types`

#### Scenario: Artist profile query hook fetches by slug
- **WHEN** the `useArtistProfile` hook is called with an artist slug
- **THEN** it SHALL fetch data from `GET /public/artists/:slug`
- **AND** the response SHALL be typed as `PublicArtistProfile` from `@ticketbox/api-types`

#### Scenario: Top artists query hook fetches ranked list
- **WHEN** the `useTopArtists` hook is called
- **THEN** it SHALL fetch data from `GET /public/artists/top`
- **AND** the response SHALL be typed as `TopArtistListResponse` from `@ticketbox/api-types`

#### Scenario: Follow mutation hook sends idempotent request
- **WHEN** the follow mutation is triggered for an artist ID
- **THEN** it SHALL send `POST /audience/artists/:id/follow` with the AUDIENCE user's auth token
- **AND** the response SHALL be typed as `ArtistFollowResponse` from `@ticketbox/api-types`

#### Scenario: Favorite mutation hook invalidates related queries
- **WHEN** a favorite or unfavorite mutation settles (success or error)
- **THEN** the hook SHALL invalidate both the artist profile query and the top artists query to ensure cache freshness

#### Scenario: No local-only response types are defined
- **WHEN** the artist API client layer is implemented
- **THEN** all request and response types SHALL come from `@ticketbox/api-types`
- **AND** no duplicate or local-only response type definitions SHALL exist in the audience web app for artist endpoints

### Requirement: SEO meta tags on artist pages
The audience web app SHALL render Open Graph and meta tags on artist pages using `react-helmet-async`.

#### Scenario: Artist list page sets page title
- **WHEN** the artist list page renders
- **THEN** the page SHALL set `<title>` to "Artists | Ticketbox"

#### Scenario: Artist profile page sets meta tags from artist data
- **WHEN** the artist profile page renders for an artist with a display name and bio
- **THEN** the page SHALL set `<title>` to "{displayName} | Ticketbox"
- **AND** `og:title` SHALL be set to the artist's display name
- **AND** `og:description` SHALL be set to the first 160 characters of the artist's bio (or omitted if bio is null)
- **AND** `og:image` SHALL be set to the artist's avatar or poster public URL (if available)
