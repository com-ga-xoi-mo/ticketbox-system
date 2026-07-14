# catalog-search-api Specification

## Purpose

TBD - created by syncing change implement-audience-discovery. Update Purpose after archive.

## Requirements

### Requirement: Concert list search and filter query parameters
The `GET /concerts` endpoint SHALL accept optional query parameters for text search, city filtering, date range filtering, price range filtering, event type filtering, and sorting, returning filtered results while maintaining backward compatibility.

#### Scenario: No query parameters returns all upcoming published concerts
- **WHEN** `GET /concerts` is called without any query parameters
- **THEN** the response includes all upcoming published concerts of any event type, sorted by `startsAt` ascending

#### Scenario: Text search by `q` parameter
- **WHEN** `GET /concerts?q=jazz` is called
- **THEN** the response includes only concerts whose `title` or `artistName` contains "jazz" (case-insensitive)
- **AND** the response shape remains `PublicConcertSummary[]`

#### Scenario: City filter by `city` parameter
- **WHEN** `GET /concerts?city=HCMC` is called
- **THEN** the response includes only concerts whose `city` field matches "HCMC" exactly

#### Scenario: EventType filter by `eventType` parameter
- **WHEN** `GET /concerts?eventType=WORKSHOP` is called
- **THEN** the response includes only concerts whose `eventType` field matches `WORKSHOP`

#### Scenario: Invalid eventType is rejected
- **WHEN** `GET /concerts?eventType=INVALID` is called
- **THEN** the endpoint returns HTTP 400 with a validation error

#### Scenario: EventType filter combines with other filters
- **WHEN** `GET /concerts?eventType=CONCERT&city=HCMC&q=rock` is called
- **THEN** all filters are applied in combination

#### Scenario: Sort by date descending
- **WHEN** `GET /concerts?sortBy=date&sortDir=desc` is called
- **THEN** the response is sorted by `startsAt` descending

#### Scenario: Sort by price ascending
- **WHEN** `GET /concerts?sortBy=price&sortDir=asc` is called
- **THEN** the response is sorted by minimum ticket type price ascending
- **AND** concerts with no ticket types appear last

#### Scenario: Combined query, city, eventType, and sort
- **WHEN** `GET /concerts?q=rock&city=Hanoi&eventType=CONCERT&sortBy=date&sortDir=asc` is called
- **THEN** all filters and sort are applied in combination

#### Scenario: Date range filter by dateFrom
- **WHEN** `GET /concerts?dateFrom=2026-07-01` is called
- **THEN** the response includes only concerts whose `startsAt` is on or after `2026-07-01T00:00:00Z`

#### Scenario: Date range filter by dateTo
- **WHEN** `GET /concerts?dateTo=2026-08-31` is called
- **THEN** the response includes only concerts whose `startsAt` is on or before `2026-08-31T23:59:59Z`

#### Scenario: Combined dateFrom and dateTo
- **WHEN** `GET /concerts?dateFrom=2026-07-01&dateTo=2026-07-31` is called
- **THEN** the response includes only concerts starting within July 2026

#### Scenario: Price range filter by minPrice
- **WHEN** `GET /concerts?minPrice=200000` is called
- **THEN** the response includes only concerts that have at least one ticket type with `priceVnd >= 200000`

#### Scenario: Price range filter by maxPrice
- **WHEN** `GET /concerts?maxPrice=500000` is called
- **THEN** the response includes only concerts that have at least one ticket type with `priceVnd <= 500000`

#### Scenario: Combined minPrice and maxPrice
- **WHEN** `GET /concerts?minPrice=200000&maxPrice=500000` is called
- **THEN** the response includes only concerts that have at least one ticket type with `priceVnd` between 200,000 and 500,000 VND inclusive

#### Scenario: All filters combined
- **WHEN** `GET /concerts?q=rock&city=Hanoi&eventType=SPORT&dateFrom=2026-07-01&dateTo=2026-08-31&minPrice=100000&maxPrice=800000&sortBy=price&sortDir=asc` is called
- **THEN** all filters and sort are applied in combination

#### Scenario: Invalid sort field is ignored
- **WHEN** `GET /concerts?sortBy=invalid` is called
- **THEN** the endpoint falls back to the default sort (date ascending)

### Requirement: Distinct cities endpoint
The backend SHALL expose a `GET /concerts/cities` endpoint that returns distinct city values from published upcoming concerts.

#### Scenario: Cities endpoint returns distinct values
- **WHEN** `GET /concerts/cities` is called and there are published upcoming concerts in "HCMC", "Hanoi", and "HCMC"
- **THEN** the response is `["HCMC", "Hanoi"]` (deduplicated)
- **AND** the response is sorted alphabetically

#### Scenario: No published concerts
- **WHEN** `GET /concerts/cities` is called and there are no published upcoming concerts
- **THEN** the response is an empty array `[]`

### Requirement: Featured concerts endpoint
The backend SHALL expose a `GET /concerts/featured` endpoint that returns featured upcoming published concerts with their banner assets, ordered by `displayOrder` ascending then `startsAt` ascending.

#### Scenario: Featured endpoint returns featured events
- **WHEN** `GET /concerts/featured` is called and there are published upcoming concerts with `isFeatured = true`
- **THEN** the response is an array of featured concert summaries including `bannerAsset` field
- **AND** results are ordered by `displayOrder` ascending, then `startsAt` ascending

#### Scenario: Featured endpoint respects limit parameter
- **WHEN** `GET /concerts/featured?limit=5` is called
- **THEN** the response contains at most 5 featured concerts

#### Scenario: Featured endpoint default limit
- **WHEN** `GET /concerts/featured` is called without a `limit` parameter
- **THEN** the response contains at most 10 featured concerts

#### Scenario: Featured endpoint maximum limit
- **WHEN** `GET /concerts/featured?limit=50` is called
- **THEN** the response contains at most 20 featured concerts (capped)

#### Scenario: Featured endpoint returns empty array when no featured events
- **WHEN** `GET /concerts/featured` is called and no published upcoming concerts have `isFeatured = true`
- **THEN** the response is an empty array `[]`

#### Scenario: Featured endpoint excludes past events
- **WHEN** `GET /concerts/featured` is called and some featured concerts have `startsAt` in the past
- **THEN** only future featured concerts are included in the response

### Requirement: EventType field in concert summary response
The `GET /concerts` list response SHALL include an `eventType` field on each concert summary.

#### Scenario: Event type included in concert list items
- **WHEN** `GET /concerts` returns concert summaries
- **THEN** each item includes an `eventType` field with the concert's event type value

#### Scenario: Event type included in concert detail
- **WHEN** `GET /concerts/:slug` returns a concert detail
- **THEN** the response includes an `eventType` field with the concert's event type value
