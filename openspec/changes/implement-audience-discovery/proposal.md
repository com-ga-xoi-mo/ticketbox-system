## Why

The audience web app (`apps/audience-web`) has a working foundation — auth, layout, basic pages, and API client — but the event discovery experience is skeletal. The homepage hero is hardcoded, event listing has no search/filter/sort, and the detail page omits artist bios, seating zones, sale window states, and edge-case handling. Audience users cannot meaningfully browse, search, or evaluate events before buying. This change upgrades the three core discovery surfaces to production-quality Ticketbox.vn-style experiences and proposes minimal backend catalog API additions where frontend-only solutions would be brittle.

## What Changes

- **Homepage discovery**: Replace the static hero with a dynamic featured-event hero and a search bar. Add sectioned event browsing (featured, upcoming) with city-based discovery tabs when the backend can supply city data.
- **Event search and filtering**: Add text search, city filter, date-range filter, price-range filter, sort controls (date, price), and empty/no-results states to the event listing page. Requires backend `GET /concerts` to accept query params (`q`, `city`, `sortBy`, `sortDir`) — propose a minimal catalog search API extension.
- **Event detail enrichment**: Display published artist bio, seating zones with zone-level availability, seating map image, sale window state indicators (upcoming, on-sale, ended), sold-out badge per ticket type and full-page sold-out state, and an unavailable/ended concert state. Wire the ticket quantity selector to local state.
- **Catalog search API contract**: Extend `GET /concerts` with optional query parameters (`q`, `city`, `sortBy`, `sortDir`) and add a `GET /concerts/cities` endpoint returning distinct city values from published concerts. Add corresponding Zod schemas to `@ticketbox/api-types`.
- **Responsive and state polish**: Ensure all three pages are mobile-first, with refined loading skeletons, contextual empty states, proper not-found handling, and graceful degradation when data is partial (no poster, no bio, no seating map).

## Capabilities

### New Capabilities
- `audience-homepage-discovery`: Homepage hero with dynamic featured event, search bar, event sections with city discovery tabs, and responsive mobile-first layout.
- `audience-event-search`: Event listing page with text search, city/date/price filtering, sort controls, pagination-ready grid, and no-results states.
- `audience-event-detail`: Enriched event detail page with artist bio, seating zone map, sale window state indicators, ticket quantity state, sold-out/unavailable/not-found handling.
- `catalog-search-api`: Backend query parameter support on `GET /concerts` (`q`, `city`, `sortBy`, `sortDir`), new `GET /concerts/cities` endpoint, and shared Zod contract additions in `@ticketbox/api-types`.

### Modified Capabilities
- `audience-web-foundation`: Add additional shadcn/ui primitives needed by discovery surfaces (tabs, select, slider, popover, date-picker wrapper) and extend shared page-state components with new variants (no-results, sold-out, unavailable).

## Impact

- **Backend (`packages/backend`)**: New query parameters on `PublicConcertCatalogController.listConcerts()`, new `GET /concerts/cities` route and use case, updated `PublicConcertCatalogPort` with filter/sort signature.
- **Shared contracts (`packages/api-types`)**: New `CatalogSearchParamsSchema`, `PublicConcertCitiesResponseSchema`, updated `PublicConcertListResponseSchema` imports.
- **Audience web (`apps/audience-web`)**: Major changes to `HomePage.tsx`, `EventListPage.tsx`, `EventDetailPage.tsx`, `EventCard.tsx`, `PageStates.tsx`; new shared hooks, filter components, and shadcn primitives.
- **No impact** on `apps/web` (organizer portal), `apps/worker`, `apps/checkin-mobile`, or existing concert management flows.
