## MODIFIED Requirements

### Requirement: Feed API Filter Support

`GET /resale/listings` SHALL support the following additional optional query parameters: `search` (string, matches against concert title), `priceMin` (number), `priceMax` (number). All existing parameters remain unchanged; this change is fully backwards compatible.

#### Scenario: Search by concert name

- **WHEN** the request includes `search=anh trai`
- **THEN** only listings belonging to concerts whose `title ILIKE '%anh trai%'` are returned

#### Scenario: Price range filter

- **WHEN** the request includes `priceMin=500000&priceMax=1000000`
- **THEN** only listings with `askingPriceVnd` within that range are returned

### Requirement: Feed Response Concert Context

Each item in the feed response SHALL include: `concertTitle` (string), `concertSlug` (string), `concertStartsAt` (ISO datetime string).

#### Scenario: Feed item includes concert fields

- **WHEN** `GET /resale/listings` returns results
- **THEN** each item has `concertTitle`, `concertSlug`, and `concertStartsAt` populated via a JOIN with the `concerts` table
