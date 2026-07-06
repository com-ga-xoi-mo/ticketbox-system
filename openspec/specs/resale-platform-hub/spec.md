# resale-platform-hub

## Purpose
TBD - Add purpose here.

## Requirements

### Requirement: Global Resale Feed Page

The system SHALL provide a `/resale` page that displays all ACTIVE resale listings across every event on the platform, without requiring users to know a specific event in advance.

#### Scenario: Load global feed

- **WHEN** a user navigates to `/resale`
- **THEN** the system displays a list of ACTIVE listings from all events, sorted by `trending` by default, with 20 items per page and infinite scroll

#### Scenario: Filter by concert name

- **WHEN** the user types text into the search bar
- **THEN** the feed displays only listings belonging to concerts whose name contains the entered text (case-insensitive)

#### Scenario: Filter by price range

- **WHEN** the user enters a `priceMin` and/or `priceMax` value
- **THEN** the feed displays only listings whose `askingPriceVnd` falls within that range

#### Scenario: Sort modes

- **WHEN** the user selects a sort tab (Trending / Newest / Price ↑ / Price ↓)
- **THEN** the feed re-fetches and displays results ordered by the selected sort mode

### Requirement: Listing Card Shows Concert Context

Each listing card on the global feed SHALL display concert information (`concertTitle`, `concertStartsAt`) so buyers can identify which event a ticket belongs to without navigating away.

#### Scenario: Listing card context

- **WHEN** a listing card renders
- **THEN** it displays: concert name, event date/time, ticket type, asking price, original face value, seller name + trust tier, upvote count, comment count

### Requirement: Global Listing Detail Page

The system SHALL provide a `/resale/:listingId` page that operates independently, with no dependency on an event `slug`.

#### Scenario: Direct access

- **WHEN** a user navigates to `/resale/:listingId`
- **THEN** the page displays full listing detail: listing info, real-time upvote count (SSE), comment thread, buy button, and message seller button

### Requirement: Route Redirect Backward Compatibility

The system SHALL redirect old routes to new routes so that existing bookmarks and shared links continue to work.

#### Scenario: Old event resale route redirect

- **WHEN** a user navigates to `/events/:slug/resale`
- **THEN** the system redirects to `/resale`

#### Scenario: Old listing detail redirect

- **WHEN** a user navigates to `/events/:slug/resale/:listingId`
- **THEN** the system redirects to `/resale/:listingId`

### Requirement: Navbar Entry Point

The navbar SHALL include a "Resale" link next to "Events" so users can access `/resale` from any page.

#### Scenario: Navbar link

- **WHEN** a user views the navbar (both desktop and mobile menu)
- **THEN** a "Resale" link is visible and navigates to `/resale`

### Requirement: Event Detail Page CTA Update

The event detail page SHALL include a "View Resale Tickets" CTA pointing to `/resale?concertId=<id>` instead of `/events/:slug/resale`.

#### Scenario: Event resale CTA

- **WHEN** an event has `resaleEnabled=true` and the user is viewing the event detail page
- **THEN** a "View Resale Tickets" button/link is present and navigates to `/resale?concertId=<concertId>`
