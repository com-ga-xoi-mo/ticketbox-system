## ADDED Requirements

### Requirement: EventType filter on event listing
The event listing page SHALL provide an event type filter control that allows users to filter events by category, using the backend `eventType` query parameter.

#### Scenario: EventType filter displays category chips
- **WHEN** the event listing page loads
- **THEN** the filter toolbar displays category chips/tabs for "All", "Concert", "Workshop", "Sport", "Movie", "Theatre", and "Voucher"

#### Scenario: Selecting an event type filters results
- **WHEN** a user selects the "Workshop" category chip
- **THEN** the page calls `GET /concerts?eventType=WORKSHOP` and displays only workshop events
- **AND** the URL updates to include `?eventType=WORKSHOP`

#### Scenario: "All" chip clears event type filter
- **WHEN** a user selects the "All" category chip
- **THEN** the page fetches concerts without the `eventType` parameter
- **AND** `eventType` is removed from the URL

#### Scenario: EventType filter combines with existing filters
- **WHEN** a user has an active search query, city filter, and selects an event type
- **THEN** all filters are sent as query params in the same request (e.g., `?q=jazz&city=HCMC&eventType=CONCERT`)

#### Scenario: EventType filter state syncs to URL
- **WHEN** a user navigates to `/events?eventType=SPORT`
- **THEN** the "Sport" category chip is visually active
- **AND** the API call includes `eventType=SPORT`

#### Scenario: EventType chip styling indicates active state
- **WHEN** an event type is selected
- **THEN** the active chip has a distinct visual style (filled/highlighted) compared to inactive chips

## MODIFIED Requirements

### Requirement: Filter state in URL search params
The event listing page SHALL sync all filter and sort state to URL search params so that filtered views are shareable and survive page refresh.

#### Scenario: Filter state is restored from URL
- **WHEN** a user navigates to `/events?q=rock&city=HCMC&eventType=CONCERT&dateFrom=2026-07-01&minPrice=200000&sortBy=price`
- **THEN** the search input shows "rock", the city filter shows "HCMC", the event type chip "Concert" is active, the date picker shows the start date, the price filter shows the minimum price, and the sort is set to price
- **AND** the API call includes all active parameters

#### Scenario: Browser back restores previous filter state
- **WHEN** a user changes filters and then presses browser back
- **THEN** the previous filter state is restored from the URL

### Requirement: Event listing loading and error states
The event listing page SHALL display appropriate loading and error states during data fetching.

#### Scenario: Loading state shows skeleton grid
- **WHEN** the concert list API is fetching
- **THEN** the page displays skeleton card placeholders in the grid layout

#### Scenario: Error state offers retry
- **WHEN** the concert list API fails
- **THEN** the page displays an error message with a retry action

### Requirement: No-results state for event listing
The event listing page SHALL display a contextual empty state when no concerts match the current filters.

#### Scenario: No results for search query
- **WHEN** a search returns zero results
- **THEN** the page displays a no-results message mentioning the search term
- **AND** offers a "Clear filters" action

#### Scenario: No results for event type filter
- **WHEN** an event type filter returns zero results
- **THEN** the page displays a no-results message for that category (e.g., "No workshops found")
- **AND** the user can clear the filter to see all events

#### Scenario: No results for city filter
- **WHEN** a city filter returns zero results
- **THEN** the page displays a no-results message for that city
- **AND** the user can clear the filter to see all events
