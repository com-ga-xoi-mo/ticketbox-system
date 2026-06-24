## MODIFIED Requirements

### Requirement: Dynamic featured event hero
The homepage SHALL display a carousel of featured events from the `GET /concerts/featured` endpoint, replacing the current single-event hero section.

#### Scenario: Hero carousel displays featured events with banners
- **WHEN** the homepage loads and `GET /concerts/featured` returns events with banner assets
- **THEN** the hero carousel displays each featured event's banner image, title, artist name, venue, city, date, and a CTA linking to the event detail page
- **AND** the carousel auto-advances every 5 seconds with manual navigation dots

#### Scenario: Hero carousel with single featured event
- **WHEN** `GET /concerts/featured` returns exactly one event
- **THEN** the hero displays the single event without navigation dots or auto-advance

#### Scenario: Hero falls back gracefully without featured events
- **WHEN** `GET /concerts/featured` returns an empty array
- **THEN** the hero section displays a generic branded marketplace banner encouraging the user to browse events
- **AND** the CTA links to the event listing page

#### Scenario: Hero carousel falls back to poster when banner is absent
- **WHEN** a featured event has no `bannerAsset` but has a `posterAsset`
- **THEN** the carousel uses the poster image as the hero background for that slide

#### Scenario: Hero carousel loading state
- **WHEN** the featured events API is loading
- **THEN** the hero area displays a skeleton placeholder matching the carousel dimensions

### Requirement: Homepage search bar
The homepage SHALL provide a search bar in the hero/carousel section that navigates the user to the event listing page with a search query pre-filled.

#### Scenario: User submits a search query from the homepage
- **WHEN** a user types a search term into the homepage search bar and submits
- **THEN** the app navigates to `/events?q=<search-term>`
- **AND** the EventListPage loads with the search query applied

#### Scenario: Empty search submission
- **WHEN** a user submits the homepage search bar with no text
- **THEN** the app navigates to `/events` without a query parameter

### Requirement: Featured events section with real data
The homepage SHALL display a "Featured events" section as a horizontally scrollable rail sourced from the catalog API, showing events across all categories with event type badges.

#### Scenario: Featured events render from API data
- **WHEN** the homepage loads and the concert list API returns results
- **THEN** the featured events section displays up to 10 event cards with poster, title, event type badge, artist, date, venue, city, price range, and availability badge

#### Scenario: Event cards show event type badge
- **WHEN** an event card renders in the featured rail
- **THEN** the card displays a colored badge indicating the event type (e.g., "Concert", "Workshop")

#### Scenario: Featured events loading state
- **WHEN** the concert list API is loading
- **THEN** the featured events section displays skeleton card placeholders

#### Scenario: Featured events error state
- **WHEN** the concert list API fails
- **THEN** the featured events section displays an error message with a retry prompt

### Requirement: City discovery tabs on homepage
The homepage SHALL display city-based discovery tabs that allow users to filter the featured events section by city, using city data from the `GET /concerts/cities` endpoint.

#### Scenario: City tabs render available cities
- **WHEN** the homepage loads and the cities endpoint returns cities
- **THEN** the homepage displays a tab bar with "All" as the default active tab followed by each available city

#### Scenario: Selecting a city tab filters featured events
- **WHEN** a user selects a city tab
- **THEN** the featured events section filters to show only concerts in that city
- **AND** the "All" tab shows concerts from all cities

#### Scenario: City tabs with single city
- **WHEN** the cities endpoint returns only one city
- **THEN** the city tabs are hidden since filtering adds no value

#### Scenario: City tabs loading state
- **WHEN** the cities endpoint is loading
- **THEN** the city tab area displays skeleton placeholders

### Requirement: Responsive homepage layout
The homepage layout SHALL be mobile-first and adapt across viewport sizes without content overflow or clipping.

#### Scenario: Mobile viewport renders stacked marketplace sections
- **WHEN** the homepage is viewed on a mobile viewport (< 640px)
- **THEN** all sections stack vertically in a single column
- **AND** the hero carousel is full-width with reduced height
- **AND** horizontal rails are swipe-scrollable
- **AND** event cards display in a single-column grid where applicable

#### Scenario: Desktop viewport renders full marketplace layout
- **WHEN** the homepage is viewed on a desktop viewport (>= 1024px)
- **THEN** the hero carousel is full-width with increased height
- **AND** the category bar is centered in a single row
- **AND** event rails show navigation arrows
- **AND** event cards display in multi-column grids where applicable
