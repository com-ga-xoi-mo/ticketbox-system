## ADDED Requirements

### Requirement: Concert coordinate fields in shared contracts
The `@ticketbox/api-types` package SHALL export Zod schemas and inferred TypeScript types for concert coordinates. On organizer create requests, `latitude` and `longitude` SHALL each be optional and nullable; omitting both SHALL create null coordinates. On organizer/admin update requests, each field SHALL be optional and nullable; omitting both SHALL preserve the stored pair, while sending both as null SHALL clear it. Protected management and public detail responses SHALL always contain required `latitude: number | null` and `longitude: number | null` fields. Request schemas SHALL reject a payload that supplies only one member of the pair or mixes a number with null.

#### Scenario: Create request with valid coordinates passes schema validation
- **WHEN** a concert create request body includes valid `latitude` (in [-90, 90]) and `longitude` (in [-180, 180])
- **THEN** the Zod schema SHALL accept the body

#### Scenario: Create request with no coordinates passes schema validation
- **WHEN** a concert create request body omits both `latitude` and `longitude`
- **THEN** the Zod schema SHALL accept the body and treat both as null

#### Scenario: Create request with only latitude fails schema validation
- **WHEN** a concert create request body includes `latitude` but no `longitude`
- **THEN** the Zod schema SHALL reject the body

#### Scenario: Create request with only longitude fails schema validation
- **WHEN** a concert create request body includes `longitude` but no `latitude`
- **THEN** the Zod schema SHALL reject the body

#### Scenario: Latitude out of range fails schema validation
- **WHEN** a request body includes `latitude` outside the range [-90, 90]
- **THEN** the Zod schema SHALL reject the body

#### Scenario: Longitude out of range fails schema validation
- **WHEN** a request body includes `longitude` outside the range [-180, 180]
- **THEN** the Zod schema SHALL reject the body

#### Scenario: Both coordinates null passes schema validation
- **WHEN** a request body includes `latitude: null` and `longitude: null`
- **THEN** the Zod schema SHALL accept the body

#### Scenario: Update omission preserves coordinates
- **WHEN** a concert update request omits both `latitude` and `longitude`
- **THEN** the Zod schema SHALL accept the body without defaulting either field
- **AND** the inferred update type SHALL preserve both properties as optional

#### Scenario: Response coordinates are required nullable fields
- **WHEN** protected management or public detail response types are inferred
- **THEN** both coordinate properties SHALL be required
- **AND** each property SHALL accept a valid number or null

#### Scenario: Public detail response includes coordinates
- **WHEN** the public audience concert detail response schema is validated
- **THEN** it SHALL include `latitude: number | null` and `longitude: number | null` in its type shape

#### Scenario: Shared package remains a dependency leaf
- **WHEN** coordinate schemas are added to `@ticketbox/api-types`
- **THEN** the package SHALL still depend only on framework-independent contract dependencies such as Zod

### Requirement: Location search contract
The `@ticketbox/api-types` package SHALL export Zod schemas and inferred TypeScript types for both the `GET /locations/search` query and response. The query schema SHALL trim `q`, require 3–200 characters after trimming, and reject unknown fields. The response SHALL contain at most 5 results with `displayName: string`, finite in-range `latitude`, and finite in-range `longitude`. The schemas SHALL NOT use `any`.

#### Scenario: Geocoding query schema validates and trims q
- **WHEN** a location query contains surrounding whitespace and 3–200 non-whitespace characters
- **THEN** the query schema SHALL accept it and return the trimmed value

#### Scenario: Geocoding query schema rejects invalid input
- **WHEN** `q` is missing, shorter than 3 characters after trimming, longer than 200 characters, or accompanied by unknown query fields
- **THEN** the query schema SHALL reject it

#### Scenario: Geocoding response schema validates correct shape
- **WHEN** a location search response matches the expected shape
- **THEN** the Zod schema SHALL accept it

#### Scenario: Geocoding response schema rejects missing fields
- **WHEN** a location search response is missing `displayName`, `latitude`, or `longitude` on any result
- **THEN** the Zod schema SHALL reject it

#### Scenario: Empty results array is valid
- **WHEN** a location search response contains `results: []`
- **THEN** the Zod schema SHALL accept it

#### Scenario: Response rejects too many or invalid results
- **WHEN** a location response has more than 5 results, a non-finite coordinate, or a coordinate outside its geographic range
- **THEN** the response schema SHALL reject it
