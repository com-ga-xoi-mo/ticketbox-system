## ADDED Requirements

### Requirement: SEO meta tags on event detail page
The event detail page SHALL render Open Graph and Twitter Card meta tags using `react-helmet-async`, sourcing values from the concert detail response's SEO fields with fallbacks to standard event data.

#### Scenario: Meta tags render from SEO fields when present
- **WHEN** the event detail page loads a concert with non-null `seoTitle`, `seoDescription`, and `seoImageUrl`
- **THEN** the `<Helmet>` component sets `<title>` to `seoTitle`
- **AND** sets `og:title` to `seoTitle`
- **AND** sets `og:description` to `seoDescription`
- **AND** sets `og:image` to `seoImageUrl`
- **AND** sets corresponding `twitter:title`, `twitter:description`, `twitter:image` tags

#### Scenario: Meta tags fall back when SEO fields are null
- **WHEN** the event detail page loads a concert with null SEO fields
- **THEN** `<title>` is set to `"{title} | Ticketbox"`
- **AND** `og:title` falls back to the concert `title`
- **AND** `og:description` falls back to the first 160 characters of `description`
- **AND** `og:image` falls back to `posterAsset.publicUrl`

#### Scenario: Event type badge on detail page
- **WHEN** the event detail page renders a concert with `eventType` of `WORKSHOP`
- **THEN** a badge displaying "Workshop" is shown near the event title

#### Scenario: Meta tags set og:type to event
- **WHEN** the event detail page renders
- **THEN** `og:type` is set to `"event"`
