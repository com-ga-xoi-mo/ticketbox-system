## ADDED Requirements

### Requirement: Top favorite artists rail on homepage
The audience homepage SHALL display a horizontal scrollable rail of top favorite artists sourced from the `GET /public/artists/top` endpoint, providing artist discovery from the main landing page.

#### Scenario: Top artists rail renders with artist cards
- **WHEN** the homepage loads and `GET /public/artists/top` returns artists
- **THEN** the homepage SHALL display a "Top Artists" section with a horizontal scrollable rail of artist cards
- **AND** each card SHALL show the artist's circular avatar, display name, and favorite count
- **AND** each card SHALL link to the artist's profile page at `/artists/:slug`

#### Scenario: Top artists rail with navigation controls
- **WHEN** the top artists rail is viewed on a desktop viewport (>= 1024px)
- **THEN** the rail SHALL display left/right navigation arrows for scrolling
- **AND** the rail SHALL support scroll snap for smooth card-to-card navigation

#### Scenario: Top artists rail on mobile
- **WHEN** the top artists rail is viewed on a mobile viewport (< 640px)
- **THEN** the rail SHALL be swipe-scrollable without navigation arrows
- **AND** the cards SHALL be appropriately sized for touch interaction

#### Scenario: Top artists rail loading state
- **WHEN** the top artists API request is in progress
- **THEN** the rail section SHALL display skeleton card placeholders matching the rail dimensions

#### Scenario: Top artists rail empty state
- **WHEN** the top artists API returns an empty array
- **THEN** the top artists rail section SHALL be hidden entirely rather than showing an empty container

#### Scenario: Top artists rail error state
- **WHEN** the top artists API request fails
- **THEN** the top artists rail section SHALL be hidden to avoid disrupting the homepage experience
- **AND** the failure SHALL NOT prevent other homepage sections from rendering

#### Scenario: Top artists rail position on homepage
- **WHEN** the homepage renders with all sections
- **THEN** the top artists rail SHALL appear after the featured events section and before or alongside the city-filtered events section
