## ADDED Requirements

### Requirement: SEO meta tags on event detail page
The event detail page SHALL render Open Graph and Twitter Card meta tags in the document head using event data from the backend, with fallbacks when SEO-specific fields are absent.

#### Scenario: Meta tags render from SEO fields
- **WHEN** the event detail page loads a concert with non-null `seoTitle`, `seoDescription`, and `seoImageUrl`
- **THEN** the document head contains `<meta property="og:title">` with the `seoTitle` value
- **AND** `<meta property="og:description">` with the `seoDescription` value
- **AND** `<meta property="og:image">` with the `seoImageUrl` value
- **AND** corresponding Twitter Card meta tags (`twitter:title`, `twitter:description`, `twitter:image`)
- **AND** `<title>` is set to `seoTitle`

#### Scenario: Meta tags fall back to event data
- **WHEN** the event detail page loads a concert with null SEO fields
- **THEN** `og:title` falls back to the concert `title`
- **AND** `og:description` falls back to the first 160 characters of `description` (or empty if null)
- **AND** `og:image` falls back to `posterAsset.publicUrl` (or omitted if null)
- **AND** `<title>` is set to `"{title} | Ticketbox"`

#### Scenario: Meta tags include event type
- **WHEN** the event detail page loads a concert with an `eventType`
- **THEN** `og:type` is set to `"event"`
- **AND** a meta tag or structured data includes the event type category

#### Scenario: Meta tags include canonical URL
- **WHEN** the event detail page renders
- **THEN** `og:url` is set to the canonical URL of the event page (e.g., `https://<domain>/events/<slug>`)

### Requirement: SEO meta tags on event listing page
The event listing page SHALL render meta tags appropriate for the current filter state.

#### Scenario: Unfiltered listing meta tags
- **WHEN** the event listing page loads without filters
- **THEN** `<title>` is set to `"Events | Ticketbox"`
- **AND** `og:title` is `"Discover Events | Ticketbox"`
- **AND** `og:description` describes the marketplace

#### Scenario: Category-filtered listing meta tags
- **WHEN** the event listing page loads with `eventType=WORKSHOP`
- **THEN** `<title>` is set to `"Workshops | Ticketbox"`
- **AND** `og:title` reflects the category name
- **AND** `og:description` describes browsing that category

#### Scenario: City-filtered listing meta tags
- **WHEN** the event listing page loads with `city=HCMC`
- **THEN** `<title>` includes the city name (e.g., `"Events in HCMC | Ticketbox"`)

### Requirement: SEO meta tags on homepage
The homepage SHALL render meta tags suitable for the marketplace landing page.

#### Scenario: Homepage meta tags
- **WHEN** the homepage loads
- **THEN** `<title>` is set to `"Ticketbox - Discover Events"`
- **AND** `og:title` is `"Ticketbox - Discover Events"`
- **AND** `og:description` describes the Ticketbox marketplace
- **AND** `og:type` is `"website"`

### Requirement: react-helmet-async integration
The audience web app SHALL use `react-helmet-async` for declarative head management across all routes.

#### Scenario: HelmetProvider wraps the app
- **WHEN** the audience web app renders
- **THEN** a `HelmetProvider` context wraps the router at the app root level

#### Scenario: Route-level Helmet components override defaults
- **WHEN** a page component renders a `<Helmet>` with meta tags
- **THEN** those tags override any previously set tags from parent components
- **AND** tags are cleaned up when the component unmounts

### Requirement: SEO fields in concert detail API response
The `GET /concerts/:slug` public concert detail response SHALL include `seoTitle`, `seoDescription`, and `seoImageUrl` fields.

#### Scenario: SEO fields present in detail response
- **WHEN** `GET /concerts/:slug` returns a concert with non-null SEO fields
- **THEN** the response includes `seoTitle`, `seoDescription`, and `seoImageUrl` with their values

#### Scenario: SEO fields null in detail response
- **WHEN** `GET /concerts/:slug` returns a concert with null SEO fields
- **THEN** the response includes `seoTitle: null`, `seoDescription: null`, and `seoImageUrl: null`
