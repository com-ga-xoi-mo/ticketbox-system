## ADDED Requirements

### Requirement: EventTypeCode enum schema
The `@ticketbox/api-types` package SHALL export an `EventTypeCodeSchema` Zod enum and inferred `EventTypeCode` type for the event type classification used in public catalog responses.

#### Scenario: EventTypeCodeSchema validates known event types
- **WHEN** `EventTypeCodeSchema` is used to parse `"CONCERT"`, `"WORKSHOP"`, `"SPORT"`, `"MOVIE"`, `"THEATRE"`, or `"VOUCHER"`
- **THEN** parsing succeeds for each value

#### Scenario: EventTypeCodeSchema rejects unknown values
- **WHEN** `EventTypeCodeSchema` is used to parse `"UNKNOWN"` or `"OTHER"`
- **THEN** parsing fails with a validation error

#### Scenario: EventTypeCode type is exported
- **WHEN** a consumer imports `EventTypeCode` from `@ticketbox/api-types`
- **THEN** the type resolves to the union `"CONCERT" | "WORKSHOP" | "SPORT" | "MOVIE" | "THEATRE" | "VOUCHER"`

### Requirement: Featured concert response schema
The `@ticketbox/api-types` package SHALL export Zod schemas and types for the `GET /concerts/featured` endpoint response.

#### Scenario: PublicFeaturedConcertSchema extends summary with banner
- **WHEN** `PublicFeaturedConcertSchema` is used to parse a featured concert object
- **THEN** parsing succeeds when the object includes all `PublicConcertSummary` fields plus `eventType`, `bannerAsset` (nullable PublicAsset), and `displayOrder`

#### Scenario: PublicFeaturedConcertListResponseSchema validates array
- **WHEN** `PublicFeaturedConcertListResponseSchema` is used to parse an array of featured concert objects
- **THEN** parsing succeeds as `PublicFeaturedConcert[]`

#### Scenario: Featured concert limit params schema
- **WHEN** `FeaturedConcertParamsSchema` is used to parse `{ limit: 5 }`
- **THEN** parsing succeeds
- **AND** `limit` is an optional positive integer

### Requirement: SEO metadata fields in detail response schema
The `@ticketbox/api-types` package SHALL extend `PublicConcertDetailResponseSchema` to include nullable SEO metadata fields.

#### Scenario: SEO fields in detail schema
- **WHEN** `PublicConcertDetailResponseSchema` is used to parse a concert detail with `seoTitle`, `seoDescription`, and `seoImageUrl`
- **THEN** parsing succeeds with all three fields present as nullable strings

#### Scenario: SEO fields null in detail schema
- **WHEN** `PublicConcertDetailResponseSchema` is used to parse a concert detail with all SEO fields set to `null`
- **THEN** parsing succeeds

## MODIFIED Requirements

### Requirement: Audience public catalog wire contracts
The shared contract package SHALL provide framework-independent Zod schemas and inferred TypeScript types for the public audience concert catalog responses consumed by the audience web app, including event type and featured metadata.

#### Scenario: Public concert list contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts` public concert list response

#### Scenario: Public concert summary includes eventType
- **WHEN** `PublicConcertSummarySchema` is used to parse a concert summary
- **THEN** the schema requires an `eventType` field validated by `EventTypeCodeSchema`

#### Scenario: Public concert detail contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts/:slug` public concert detail response including SEO fields

#### Scenario: Public concert availability contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts/:slug/availability` public concert availability response

#### Scenario: Public featured concert contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts/featured` response

#### Scenario: Audience app validates public catalog responses
- **WHEN** the audience web app receives a successful public catalog response
- **THEN** it validates the payload with the matching shared schema before returning data to route or feature code

#### Scenario: Public catalog contracts stay framework-independent
- **WHEN** public catalog contract files are compiled
- **THEN** they depend only on framework-independent contract dependencies such as Zod
- **AND** they do not import backend, React, Vite, Prisma, NestJS, or app-specific UI code

#### Scenario: Backend public catalog mapper is contract-tested
- **WHEN** the backend maps public concert catalog use-case results to HTTP responses consumed by the audience app
- **THEN** contract tests validate representative list, detail, featured, and availability payloads with the corresponding shared schemas

### Requirement: Catalog search Zod contracts
The `@ticketbox/api-types` package SHALL export Zod schemas for the catalog search query parameters including event type filtering, and the cities response.

#### Scenario: CatalogSearchParams schema validates eventType
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ eventType: "WORKSHOP" }`
- **THEN** parsing succeeds with `eventType` present

#### Scenario: CatalogSearchParams schema rejects invalid eventType
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ eventType: "INVALID" }`
- **THEN** parsing fails with a validation error

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

#### Scenario: CatalogSearchParams schema validates date fields as ISO date strings
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ dateFrom: "not-a-date" }`
- **THEN** parsing fails with a validation error
- **AND** `dateFrom` and `dateTo` MUST be ISO 8601 date strings (e.g. `"2026-07-01"`)

#### Scenario: CatalogSearchParams schema validates price fields as non-negative integers
- **WHEN** `CatalogSearchParamsSchema` is used to parse `{ minPrice: -1 }`
- **THEN** parsing fails with a validation error
- **AND** `minPrice` and `maxPrice` MUST be non-negative integers representing VND amounts

#### Scenario: PublicConcertCitiesResponse schema validates string array
- **WHEN** `PublicConcertCitiesResponseSchema` is used to parse `["HCMC", "Hanoi"]`
- **THEN** parsing succeeds as `string[]`
