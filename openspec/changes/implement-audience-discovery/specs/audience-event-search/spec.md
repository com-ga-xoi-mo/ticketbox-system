## ADDED Requirements

### Requirement: Text search on event listing
The event listing page SHALL provide a text search input that filters concerts by title or artist name using the backend `q` query parameter.

#### Scenario: User searches by keyword
- **WHEN** a user types a search term into the search input and the query is submitted
- **THEN** the page calls `GET /concerts?q=<term>` and displays matching results
- **AND** the search term is reflected in the URL as `?q=<term>`

#### Scenario: Search is case-insensitive
- **WHEN** a user searches for "jazz" or "JAZZ" or "Jazz"
- **THEN** the results are identical regardless of case

#### Scenario: Clearing search shows all events
- **WHEN** a user clears the search input
- **THEN** the page fetches all concerts without the `q` parameter

### Requirement: City filter on event listing
The event listing page SHALL provide a city filter dropdown populated from the `GET /concerts/cities` endpoint.

#### Scenario: City filter dropdown shows available cities
- **WHEN** the event listing page loads
- **THEN** the city filter dropdown displays an "All cities" option followed by each city returned by the cities endpoint

#### Scenario: Selecting a city filters results
- **WHEN** a user selects a city from the dropdown
- **THEN** the page calls `GET /concerts?city=<city>` and displays only concerts in that city
- **AND** the URL updates to include `?city=<city>`

#### Scenario: Combined search and city filter
- **WHEN** a user has both a search term and a city selected
- **THEN** the page calls `GET /concerts?q=<term>&city=<city>` applying both filters

### Requirement: Sort controls on event listing
The event listing page SHALL provide sort controls allowing the user to sort concerts by date or price.

#### Scenario: Default sort is by date ascending
- **WHEN** the event listing page loads without sort params
- **THEN** concerts are displayed sorted by start date ascending (nearest first)

#### Scenario: User sorts by price ascending
- **WHEN** a user selects "Price: low to high" sort option
- **THEN** the page calls `GET /concerts?sortBy=price&sortDir=asc` and re-renders the grid sorted by minimum price ascending

#### Scenario: Sort persists with filters
- **WHEN** a user has active search/city filters and changes the sort
- **THEN** the sort is applied in combination with existing filters
- **AND** the URL reflects all active params

### Requirement: Filter state in URL search params
The event listing page SHALL sync all filter and sort state to URL search params so that filtered views are shareable and survive page refresh.

#### Scenario: Filter state is restored from URL
- **WHEN** a user navigates to `/events?q=rock&city=HCMC&sortBy=price`
- **THEN** the search input shows "rock", the city filter shows "HCMC", and the sort is set to price
- **AND** the API call includes all three parameters

#### Scenario: Browser back restores previous filter state
- **WHEN** a user changes filters and then presses browser back
- **THEN** the previous filter state is restored from the URL

### Requirement: No-results state for event listing
The event listing page SHALL display a contextual empty state when no concerts match the current filters.

#### Scenario: No results for search query
- **WHEN** a search returns zero results
- **THEN** the page displays a no-results message mentioning the search term
- **AND** offers a "Clear filters" action

#### Scenario: No results for city filter
- **WHEN** a city filter returns zero results
- **THEN** the page displays a no-results message for that city
- **AND** the user can clear the filter to see all events

### Requirement: Event listing loading and error states
The event listing page SHALL display appropriate loading and error states during data fetching.

#### Scenario: Loading state shows skeleton grid
- **WHEN** the concert list API is fetching
- **THEN** the page displays skeleton card placeholders in the grid layout

#### Scenario: Error state offers retry
- **WHEN** the concert list API fails
- **THEN** the page displays an error message with a retry action

### Requirement: Responsive event listing layout
The event listing page SHALL use a responsive grid that adapts from 1 column on mobile to 3 columns on desktop.

#### Scenario: Mobile single-column grid
- **WHEN** the event listing is viewed on mobile (< 640px)
- **THEN** event cards display in a single column with full-width filter controls above

#### Scenario: Desktop three-column grid with inline filters
- **WHEN** the event listing is viewed on desktop (>= 1024px)
- **THEN** event cards display in a 3-column grid with search, city filter, and sort controls in a horizontal toolbar
