## ADDED Requirements

### Requirement: Concert list search and filter query parameters
The `GET /concerts` endpoint SHALL accept optional query parameters for text search, city filtering, and sorting, returning filtered results while maintaining backward compatibility.

#### Scenario: No query parameters returns all upcoming published concerts
- **WHEN** `GET /concerts` is called without any query parameters
- **THEN** the response is identical to the current behavior: all upcoming published concerts sorted by `startsAt` ascending

#### Scenario: Text search by `q` parameter
- **WHEN** `GET /concerts?q=jazz` is called
- **THEN** the response includes only concerts whose `title` or `artistName` contains "jazz" (case-insensitive)
- **AND** the response shape remains `PublicConcertSummary[]`

#### Scenario: City filter by `city` parameter
- **WHEN** `GET /concerts?city=HCMC` is called
- **THEN** the response includes only concerts whose `city` field matches "HCMC" exactly

#### Scenario: Sort by date descending
- **WHEN** `GET /concerts?sortBy=date&sortDir=desc` is called
- **THEN** the response is sorted by `startsAt` descending

#### Scenario: Sort by price ascending
- **WHEN** `GET /concerts?sortBy=price&sortDir=asc` is called
- **THEN** the response is sorted by minimum ticket type price ascending
- **AND** concerts with no ticket types appear last

#### Scenario: Combined query, city, and sort
- **WHEN** `GET /concerts?q=rock&city=Hanoi&sortBy=date&sortDir=asc` is called
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

### Requirement: Catalog search Zod contracts
The `@ticketbox/api-types` package SHALL export Zod schemas for the catalog search query parameters and the cities response.

#### Scenario: CatalogSearchParams schema validates query params
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ q: "jazz", city: "HCMC", sortBy: "date", sortDir: "asc" }`
- **THEN** parsing succeeds with all fields present

#### Scenario: CatalogSearchParams schema allows empty params
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{}`
- **THEN** parsing succeeds with all fields undefined (all are optional)

#### Scenario: CatalogSearchParams schema restricts sortBy values
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ sortBy: "invalid" }`
- **THEN** parsing fails with a validation error
- **AND** only `"date"` and `"price"` are accepted values for `sortBy`

#### Scenario: CatalogSearchParams schema restricts sortDir values
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ sortDir: "invalid" }`
- **THEN** parsing fails with a validation error
- **AND** only `"asc"` and `"desc"` are accepted values for `sortDir`

#### Scenario: PublicConcertCitiesResponse schema validates string array
- **WHEN** `PublicConcertCitiesResponseSchema` is used to parse `["HCMC", "Hanoi"]`
- **THEN** parsing succeeds as `string[]`
