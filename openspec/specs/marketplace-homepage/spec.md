## ADDED Requirements

### Requirement: Marketplace homepage layout structure
The audience homepage SHALL display a marketplace-style layout with distinct sections: hero banner carousel, category navigation bar, featured event rails, popular categories grid, and city/date quick-discovery area.

#### Scenario: Homepage renders all marketplace sections
- **WHEN** the homepage loads successfully
- **THEN** the page displays, in order: hero banner carousel, category navigation bar, featured event rail, popular categories grid, and city discovery section
- **AND** each section loads independently with its own loading/error state

#### Scenario: Homepage sections load in parallel
- **WHEN** the homepage loads
- **THEN** each section fetches its data independently via separate TanStack Query hooks
- **AND** a slow or failed section does not block other sections from rendering

### Requirement: Hero banner carousel
The homepage SHALL display a carousel of featured events with banner images, replacing the current single-hero layout.

#### Scenario: Carousel displays featured events with banners
- **WHEN** the homepage loads and `GET /concerts/featured` returns events with banner assets
- **THEN** the carousel displays each featured event's banner image, title, artist name, date, venue, and a CTA linking to the event detail page
- **AND** the carousel auto-advances every 5 seconds

#### Scenario: Carousel with single featured event
- **WHEN** `GET /concerts/featured` returns exactly one event
- **THEN** the carousel displays the single event without navigation dots or auto-advance

#### Scenario: Carousel falls back when no featured events exist
- **WHEN** `GET /concerts/featured` returns an empty array
- **THEN** the hero section displays a generic branded banner with a CTA to browse all events

#### Scenario: Carousel falls back to poster when banner is absent
- **WHEN** a featured event has no `bannerAsset` but has a `posterAsset`
- **THEN** the carousel uses the poster image as the background

#### Scenario: Carousel loading state
- **WHEN** the featured events API is loading
- **THEN** the carousel area displays a skeleton placeholder matching the carousel dimensions

### Requirement: Category navigation bar
The homepage SHALL display a horizontal category navigation bar with icons for each event type, allowing users to navigate to category-filtered event listings.

#### Scenario: Category bar displays all event types
- **WHEN** the homepage loads
- **THEN** the category bar displays navigation items for Concert, Workshop, Sport, Movie, Theatre, and Voucher
- **AND** each item has a distinct icon and label

#### Scenario: Clicking a category navigates to filtered listing
- **WHEN** a user clicks a category item (e.g., "Workshop")
- **THEN** the app navigates to `/events?eventType=WORKSHOP`

#### Scenario: Category bar is horizontally scrollable on mobile
- **WHEN** the category bar is viewed on a mobile viewport (< 640px)
- **THEN** the bar is horizontally scrollable with no wrapping
- **AND** overflow indicators hint at more items

#### Scenario: Category bar displays in a single row on desktop
- **WHEN** the category bar is viewed on a desktop viewport (>= 1024px)
- **THEN** all category items display in a centered single row without scrolling

### Requirement: Featured event rail section
The homepage SHALL display a horizontal scrollable rail of featured/popular events grouped by relevance, sourced from the catalog API.

#### Scenario: Featured rail renders up to 10 events
- **WHEN** the homepage loads and the concert list API returns results
- **THEN** the featured rail section displays up to 10 event cards with poster, title, event type badge, artist/organizer, date, venue, city, and price range

#### Scenario: Featured rail is horizontally scrollable
- **WHEN** the featured rail contains more events than fit the viewport
- **THEN** the rail is horizontally scrollable with navigation arrows on desktop and swipe on mobile

#### Scenario: Event cards display event type badge
- **WHEN** an event card renders in the featured rail
- **THEN** the card displays a colored badge indicating the event type (e.g., "Concert", "Workshop")

#### Scenario: Featured rail loading state
- **WHEN** the concert list API is loading
- **THEN** the featured rail displays skeleton card placeholders

#### Scenario: Featured rail error state
- **WHEN** the concert list API fails
- **THEN** the featured rail displays an error message with a retry action

### Requirement: Popular categories grid
The homepage SHALL display a grid of popular event categories with representative imagery and event counts.

#### Scenario: Categories grid displays all event types
- **WHEN** the homepage loads
- **THEN** the popular categories section displays a card for each event type with a representative icon/image, the category name, and a short description

#### Scenario: Clicking a category card navigates to filtered listing
- **WHEN** a user clicks a category card
- **THEN** the app navigates to `/events?eventType=<TYPE>`

#### Scenario: Categories grid responsive layout
- **WHEN** the categories grid is viewed on mobile (< 640px)
- **THEN** it displays in a 2-column grid
- **AND** on tablet (640px-1023px) in a 3-column grid
- **AND** on desktop (>= 1024px) in a 3-column or 6-column grid

### Requirement: City and date quick-discovery section
The homepage SHALL display a quick-discovery section allowing users to jump to event listings filtered by city or date range.

#### Scenario: City pills render from cities endpoint
- **WHEN** the homepage loads and `GET /concerts/cities` returns cities
- **THEN** the discovery section displays clickable city pills for each available city

#### Scenario: Clicking a city pill navigates to filtered listing
- **WHEN** a user clicks a city pill (e.g., "HCMC")
- **THEN** the app navigates to `/events?city=HCMC`

#### Scenario: Date shortcuts for common ranges
- **WHEN** the discovery section renders
- **THEN** it displays quick-filter buttons for "This weekend", "This month", and "Next month"
- **AND** clicking a date shortcut navigates to `/events?dateFrom=<start>&dateTo=<end>` with computed ISO dates

#### Scenario: Discovery section loading state
- **WHEN** the cities endpoint is loading
- **THEN** the city pills area displays skeleton placeholders

### Requirement: Responsive marketplace homepage
The marketplace homepage layout SHALL be mobile-first and adapt across viewport sizes.

#### Scenario: Mobile viewport renders stacked sections
- **WHEN** the homepage is viewed on mobile (< 640px)
- **THEN** all sections stack vertically in a single column
- **AND** the hero carousel is full-width with reduced height
- **AND** horizontal rails are swipe-scrollable

#### Scenario: Desktop viewport renders full marketplace layout
- **WHEN** the homepage is viewed on desktop (>= 1024px)
- **THEN** the hero carousel is full-width with increased height
- **AND** the category bar is centered
- **AND** event rails show navigation arrows
- **AND** the popular categories grid uses 3 or 6 columns
