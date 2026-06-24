## Context

The audience web app (`apps/audience-web`) has a working foundation: Vite 7 + React 18 + Tailwind v4 + shadcn/Radix components, TanStack Query data layer, auth flow, and three skeletal concert pages (HomePage, EventListPage, EventDetailPage). The backend exposes three public catalog endpoints via `PublicConcertCatalogController`:

- `GET /concerts` — returns all upcoming published concerts as a flat array, no query params
- `GET /concerts/:slug` — returns full concert detail including artist bio, seating zones, ticket types
- `GET /concerts/:slug/availability` — returns real-time ticket availability snapshot

The Prisma repository (`PrismaPublicConcertCatalogRepository`) filters by `status: PUBLISHED` and `startsAt >= now`, ordered by `startsAt ASC`. The `city` field exists on every concert record. Shared Zod contracts in `@ticketbox/api-types` validate all response shapes.

**Current gaps:**
- `GET /concerts` accepts no query parameters — no search, filter, or sort
- No endpoint returns distinct city values for filter UI
- HomePage hero is hardcoded; featured events section just slices first 6 from the full list
- EventListPage renders a flat grid with no search/filter/sort controls
- EventDetailPage omits: artist bio display, seating zone visualization, sale window state indicators, sold-out handling, ticket quantity state management
- No empty-search, no-results, or unavailable-event states

## Goals / Non-Goals

**Goals:**
- Enable audience users to discover events through search, city filtering, and sorted browsing
- Upgrade HomePage to a production-quality Ticketbox.vn-style discovery surface with dynamic content
- Enrich EventDetailPage with all available concert data (bio, zones, seating map, sale states)
- Add minimal backend API extensions to support search/filter without inventing parallel data models
- Handle all edge states: loading, empty, no-results, sold-out, sale-not-started, sale-ended, not-found

**Non-Goals:**
- Pagination or infinite scroll (the catalog is small enough for client-side rendering of all results)
- Full-text search engine (Elasticsearch, Meilisearch) — use Prisma `contains` for v1
- Category/genre taxonomy — the data model has no category field; defer to a future change
- Ticket purchase flow (ordering, cart, checkout) — separate capability
- Server-side rendering or SEO optimization — Vite SPA is sufficient for v1
- Ant Design migration of existing shadcn components — the foundation spec allows shadcn for brand surfaces

## Decisions

### D1: Backend search via query parameters on `GET /concerts`

**Decision:** Extend the existing `GET /concerts` endpoint with optional query parameters (`q`, `city`, `sortBy`, `sortDir`) rather than creating a new `/concerts/search` endpoint.

**Rationale:** The existing endpoint returns the same data shape. Adding optional params is backward-compatible — callers that send no params get the same behavior. A separate search endpoint would duplicate the response contract and force the frontend to manage two data sources.

**Alternatives considered:**
- *Frontend-only filtering:* Fetch all concerts and filter client-side. Works for small catalogs but doesn't scale, and forces the frontend to download all data even when the user wants one city. Rejected because it creates a frontend-only model that diverges from backend truth.
- *New `GET /concerts/search` endpoint:* Adds a parallel route with identical response shape. More RESTful for complex search, but overkill when we're adding 4 optional params.

### D2: City list via `GET /concerts/cities`

**Decision:** Add a lightweight `GET /concerts/cities` endpoint that returns `string[]` of distinct city values from published upcoming concerts.

**Rationale:** The frontend needs city filter options without downloading all concert records. This is a simple `SELECT DISTINCT city` query. Embedding cities in the concert list response would couple pagination/filtering with filter-option discovery.

**Alternatives considered:**
- *Hardcoded city list in frontend:* Brittle, goes stale as organizers add concerts in new cities.
- *Derive from fetched concert list:* Works only if all concerts are already loaded; breaks if we add pagination later.

### D3: Prisma `contains` for text search (v1)

**Decision:** Use Prisma's `contains` (case-insensitive via `mode: 'insensitive'`) on `title` and `artistName` fields for the `q` parameter.

**Rationale:** The concert catalog is small (tens to low hundreds of records). Prisma `contains` maps to SQL `ILIKE` on Postgres, which is adequate at this scale. No additional infrastructure needed.

**Alternatives considered:**
- *Prisma full-text search:* Requires Postgres `tsvector` columns and migration. Overkill for v1.
- *External search service:* Adds operational complexity for a small dataset.

### D4: Client-side sale window state derivation

**Decision:** Derive ticket sale window state (`upcoming`, `on-sale`, `ended`) in the frontend from `saleStartsAt`, `saleEndsAt`, and the current time, rather than adding a computed field to the backend response.

**Rationale:** The backend already returns `saleStartsAt` and `saleEndsAt` for each ticket type. Computing `isBefore(now, saleStartsAt)` vs `isAfter(now, saleEndsAt)` is trivial and avoids coupling the backend to UI presentation logic. The `status` field already covers `SOLD_OUT`, `PAUSED`, and `ARCHIVED`.

### D5: Ticket quantity state managed locally in EventDetailPage

**Decision:** Manage ticket quantity selection as local React state (`Map<ticketTypeId, quantity>`) within the EventDetailPage component, not in a global cart store.

**Rationale:** There is no cart or ordering flow yet. The quantity selector needs to be functional (respond to +/- clicks, respect `maxPerUser` and `availableQuantity` bounds), but the "Tiep tuc mua ve" button remains a placeholder until the ticket-purchase capability is built. A global store would be premature.

### D6: Seating map rendered as an image, not interactive SVG

**Decision:** Display the seating map asset as an `<img>` with zone legend alongside, rather than parsing and rendering interactive SVG with clickable zones.

**Rationale:** The seating map is stored as an uploaded asset (image file). Interactive SVG seat selection requires the SVG source to be embedded in the DOM with zone `svgElementId` matching — this is a complex feature better suited to the ticket-purchase flow where zone selection affects the order. For discovery, a visual reference with a color-coded legend is sufficient.

### D7: Filter state in URL search params

**Decision:** Sync EventListPage filter/sort state to URL search params (`?q=...&city=...&sortBy=...`) using `useSearchParams` from react-router-dom.

**Rationale:** Enables shareable filtered URLs, browser back/forward navigation through filter states, and avoids losing filter context on page refresh. TanStack Query keys will include the filter params so cached data is keyed correctly.

### D8: New shadcn primitives added incrementally

**Decision:** Add only the shadcn/ui primitives needed by discovery surfaces: `tabs`, `select`, `popover`, `dialog`. Do not pre-install unused components.

**Rationale:** The shadcn model is copy-paste-own. Each component adds to the bundle and maintenance surface. Install only what's immediately used. The existing `badge`, `button`, `card`, `input`, `separator`, `sheet`, `skeleton` cover most needs.

## Risks / Trade-offs

**[Risk] Prisma `contains` search performance at scale** → Mitigation: Adequate for current catalog size (< 500 concerts). If the catalog grows significantly, add a Postgres GIN trigram index on `title` and `artistName`, or migrate to full-text search. This is a known upgrade path, not a rewrite.

**[Risk] City list endpoint becomes stale if concerts are unpublished** → Mitigation: The endpoint queries only `PUBLISHED` concerts with `startsAt >= now`, so it stays consistent with the concert list. No caching layer needed at current scale.

**[Risk] Frontend sale window state can drift from server time** → Mitigation: Sale window states are informational badges, not authorization gates. The backend enforces sale window constraints at order creation time. A few seconds of client-server clock drift is acceptable for display purposes.

**[Risk] Seating map image may not match zone labels** → Mitigation: The seating map asset is uploaded by the organizer alongside zone definitions. If the image doesn't match zone labels, it's an organizer data quality issue. The UI shows both image and zone legend so the audience can cross-reference. Interactive SVG validation is deferred to the ticket-purchase capability.

**[Trade-off] No pagination** → The full concert list is returned on every search query. This is fine for < 500 records but will need cursor-based pagination if the catalog grows. The API contract change (adding `q`, `city`, `sortBy`, `sortDir` params) is forward-compatible with adding `cursor`/`limit` later.
