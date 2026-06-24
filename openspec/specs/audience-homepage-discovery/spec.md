# audience-homepage-discovery Specification

## Purpose

TBD - created by syncing change implement-audience-discovery. Update Purpose after archive.

## Requirements

### Requirement: Dynamic featured event hero
The homepage SHALL display a dynamic hero section that showcases a featured event from the published catalog, replacing the current hardcoded hero content.

#### Scenario: Hero displays the nearest upcoming concert
- **WHEN** the homepage loads with at least one published upcoming concert
- **THEN** the hero section displays the first concert's title, artist name, venue, city, date, and poster image
- **AND** the hero includes a primary CTA linking to that concert's detail page

#### Scenario: Hero falls back gracefully without concerts
- **WHEN** the homepage loads with no published upcoming concerts
- **THEN** the hero section displays a generic branded message encouraging the user to check back later
- **AND** the CTA links to the event listing page

#### Scenario: Hero poster image resolution
- **WHEN** the featured concert has a `posterAsset` with a `publicUrl`
- **THEN** the hero displays the poster image using the resolved URL
- **AND** falls back to `GET /assets/:id` only when `publicUrl` is null

### Requirement: Homepage search bar
The homepage SHALL provide a search bar in the hero section that navigates the user to the event listing page with a search query pre-filled.

#### Scenario: User submits a search query from the homepage
- **WHEN** a user types a search term into the homepage search bar and submits
- **THEN** the app navigates to `/events?q=<search-term>`
- **AND** the EventListPage loads with the search query applied

#### Scenario: Empty search submission
- **WHEN** a user submits the homepage search bar with no text
- **THEN** the app navigates to `/events` without a query parameter

### Requirement: Featured events section with real data
The homepage SHALL display a "Featured events" section that renders up to 6 upcoming concerts from the catalog API, replacing the current hardcoded slice.

#### Scenario: Featured events render from API data
- **WHEN** the homepage loads and the concert list API returns results
- **THEN** the featured events section displays up to 6 concert cards with poster, title, artist, date, venue, city, price range, and availability badge

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

#### Scenario: Mobile viewport renders single-column hero
- **WHEN** the homepage is viewed on a mobile viewport (< 640px)
- **THEN** the hero section stacks vertically with search bar, text content, and featured image
- **AND** event cards display in a single-column grid

#### Scenario: Desktop viewport renders two-column hero
- **WHEN** the homepage is viewed on a desktop viewport (>= 1024px)
- **THEN** the hero section displays text/search on the left and featured poster on the right
- **AND** event cards display in a 3-column grid
