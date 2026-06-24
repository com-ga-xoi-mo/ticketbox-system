## Why

The audience web app currently serves a concert-only experience — a single hero, a flat event list, and detail pages that assume every listing is a concert. To grow into a Ticketbox.vn-like marketplace, the platform needs multi-category discovery (concert, workshop, sport, movie, theatre, voucher), curated homepage sections (featured banners, campaign rails, popular categories), and basic SEO metadata so that event and marketplace pages can be indexed and shared effectively. The backend catalog model and endpoints lack category/event-type classification, featured/banner metadata, and SEO fields, so minimal additions are required to support the new frontend without creating a parallel data model.

## What Changes

- **Add `eventType` classification to the Concert model** — new enum field (`CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER`) with `CONCERT` as default, exposed in public catalog responses and filterable via query param.
- **Add featured/banner metadata to the Concert model** — `isFeatured` flag and optional `bannerAssetId` (reusing existing Asset relation) plus `displayOrder` for curated homepage sections.
- **Add SEO metadata to the Concert model** — `seoTitle`, `seoDescription`, `seoImageUrl` optional fields for Open Graph / social sharing on detail and listing pages.
- **Extend catalog search API** — new `eventType` query parameter for filtering; new `GET /concerts/featured` endpoint returning featured events with banner assets; expose new fields in existing summary and detail response schemas.
- **Expand audience homepage into marketplace layout** — replace single-hero + flat-featured with: category navigation bar, featured banner carousel, campaign/category rails, city/date quick-discovery, and event cards grouped by category.
- **Add category-aware event listing** — event search page gains an `eventType` filter chip/tab, and category landing pages (e.g., `/events?eventType=WORKSHOP`) with tailored headers.
- **Add SEO metadata rendering** — `<meta>` tags (Open Graph, Twitter Card) on event detail pages and marketplace/category listing pages, driven by backend SEO fields with sensible fallbacks.
- **Update shared API contracts** — extend `@ticketbox/api-types` Zod schemas for new fields: `eventType` enum, featured metadata, SEO fields, and the new featured-events response.

## Capabilities

### New Capabilities
- `marketplace-event-types`: Multi-category event type system — backend enum, Prisma field, catalog query support, and shared contract additions for classifying events beyond concerts.
- `marketplace-homepage`: Marketplace-style homepage layout — featured banner carousel, category navigation bar, campaign rails, popular-category cards, and city/date quick-discovery sections, replacing the current concert-only homepage.
- `marketplace-seo`: SEO and social-sharing metadata — backend model fields, contract schemas, and frontend `<meta>` tag rendering for event detail and category listing pages.

### Modified Capabilities
- `catalog-search-api`: Add `eventType` query parameter filtering, `GET /concerts/featured` endpoint, and expose `eventType`, `isFeatured`, `bannerAsset`, `displayOrder`, and SEO fields in existing response schemas.
- `audience-event-search`: Add `eventType` filter control (chip/tab) to the event listing page, with URL sync and combined filtering with existing search/city/date/price filters.
- `audience-event-detail`: Render SEO `<meta>` tags (Open Graph, Twitter Card) using backend SEO fields with fallbacks to title/description/poster.
- `audience-homepage-discovery`: Replace current single-hero and flat-featured layout with marketplace sections consuming the new featured endpoint and category-aware catalog queries.
- `shared-api-contracts`: Extend public catalog Zod schemas with `EventTypeCode` enum, featured metadata fields, SEO fields, and the new featured-events response schema.

## Impact

- **Database**: Prisma schema migration adding `eventType` enum + column, `isFeatured`, `bannerAssetId`, `displayOrder`, `seoTitle`, `seoDescription`, `seoImageUrl` to the `Concert` table. Non-breaking — all new fields have defaults or are optional.
- **Backend API** (`packages/backend/src/concert-management/`): New fields in public catalog DTOs/mappers; new query filter logic in `PublicConcertCatalogController`; new `GET /concerts/featured` route. Organizer endpoints gain ability to set `eventType`, featured, and SEO fields on create/update.
- **Shared contracts** (`packages/api-types/`): New `EventTypeCode` enum schema; extended `PublicConcertSummarySchema` and `PublicConcertDetailResponseSchema`; new `PublicFeaturedConcertSchema` and response schema.
- **Audience web** (`apps/audience-web/`): Major homepage redesign; new category navigation component; updated event list with eventType filter; SEO `<meta>` tag integration via `react-helmet-async` or equivalent; new API client methods for featured endpoint.
- **Organizer web** (`apps/web/`): Minor — concert create/edit forms gain eventType selector, featured toggle, and SEO fields. Not in scope for this change (can be a follow-up).
- **No breaking changes**: All additions are backward-compatible. Existing `GET /concerts` without `eventType` param returns all types. Default `eventType` is `CONCERT` so existing data is unaffected.
