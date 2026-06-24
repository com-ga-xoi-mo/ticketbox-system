## Context

The Ticketbox audience web app (`apps/audience-web`) currently serves a concert-only discovery experience: a single hero section highlighting the nearest upcoming concert, a flat event listing with search/city/date/price filters, and detail pages. The backend catalog (`packages/backend/src/concert-management/`) operates exclusively on the `Concert` model, which lacks any category/event-type classification, featured/banner metadata, or SEO fields.

The system uses a clean architecture pattern: Prisma schema → domain types → use cases → HTTP controllers, with `@ticketbox/api-types` providing shared Zod contracts consumed by both backend and audience web. The audience web is built with React, Vite, React Router v6, shadcn/ui primitives, Tailwind CSS, and TanStack Query for data fetching.

Existing public catalog endpoints:
- `GET /concerts` — list with `q`, `city`, `dateFrom`, `dateTo`, `minPrice`, `maxPrice`, `sortBy`, `sortDir`
- `GET /concerts/cities` — distinct city values
- `GET /concerts/:slug` — detail with ticket types, zones, bio
- `GET /concerts/:slug/availability` — real-time ticket availability

The `AUDIENCE` role is the existing customer role. No new role is needed.

## Goals / Non-Goals

**Goals:**
- Extend the Concert model with `eventType` enum, featured/banner metadata, and SEO fields via a single non-breaking Prisma migration
- Add `eventType` filtering to existing `GET /concerts` and a new `GET /concerts/featured` endpoint
- Expand shared Zod contracts to include new fields while maintaining backward compatibility
- Redesign the audience homepage into a marketplace layout with category navigation, featured banner carousel, campaign rails, and city/date discovery
- Add `eventType` filter control to the event listing page
- Render SEO meta tags on event detail and listing pages using backend fields with sensible fallbacks
- Keep the `AUDIENCE` role unchanged — "customer" means existing `AUDIENCE` users

**Non-Goals:**
- Organizer-side UI for setting `eventType`, featured, or SEO fields (follow-up change)
- Full-text search engine (Elasticsearch, Meilisearch) — current Prisma `contains` is sufficient at this scale
- Pagination / infinite scroll for catalog (can be added later)
- User preferences, personalization, or recommendation algorithms
- Ticket purchase flow changes (already implemented)
- New user roles or permissions
- Mobile app (checkin-mobile-app) changes
- Admin dashboard for managing featured content (follow-up)

## Decisions

### D1: Extend Concert model rather than create a new Event entity

**Decision**: Add `eventType`, featured metadata, and SEO fields directly to the existing `Concert` model/table.

**Rationale**: The Concert model already carries all the fields needed for an event (title, venue, dates, tickets, zones). Creating a separate `Event` entity would duplicate structure, require migrating existing data, and break the clean relationship graph (orders, tickets, check-ins all point to Concert). The name "Concert" in the database is a legacy label — the domain concept is broadening to "event" but the table can remain `concerts` without confusion in code since all public-facing APIs and UI already use "event" terminology.

**Alternatives considered**:
- New `Event` model with Concert as a subtype → excessive complexity for what is effectively adding a classification field
- Rename `Concert` to `Event` everywhere → high-risk refactor touching every module; can be done later if warranted

### D2: EventType as a Prisma enum with six initial values

**Decision**: Create `EventType` enum with values `CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER`. Default to `CONCERT` so existing rows are unaffected.

**Rationale**: A database enum provides type safety and query performance. Six categories match the Ticketbox.vn reference. New values can be added via migration without breaking existing data. Using an enum over a free-text field prevents category fragmentation.

**Alternatives considered**:
- Free-text `category` string → no validation, drift risk, harder to build category navigation
- Separate `Category` table with foreign key → over-engineered for a fixed set of 6 values; adds a join to every catalog query

### D3: Featured metadata as simple flags on Concert

**Decision**: Add `isFeatured` (boolean, default false), `bannerAssetId` (optional UUID FK to Asset), and `displayOrder` (integer, default 0) to the Concert model.

**Rationale**: Featured events are curated editorially. A boolean flag + display order is the simplest approach. The banner asset reuses the existing Asset model and upload infrastructure. `displayOrder` allows manual ordering of featured items on the homepage.

**Alternatives considered**:
- Separate `FeaturedEvent` junction table → adds complexity; not needed when featured is a simple property of an event
- Campaign/promotion entity → out of scope; campaigns can be layered on top later

### D4: SEO fields as optional strings on Concert

**Decision**: Add `seoTitle` (varchar 160), `seoDescription` (varchar 320), `seoImageUrl` (text, nullable) as optional fields. Frontend falls back to `title`, `description`, and `posterAsset.publicUrl` when SEO fields are null.

**Rationale**: Keeping SEO metadata on the model is the simplest path. Three fields cover Open Graph and Twitter Card requirements. Character limits follow SEO best practices. Fallback logic ensures every page has meta tags even without explicit SEO content.

**Alternatives considered**:
- JSON blob for SEO metadata → loses schema validation and query ability
- Separate SEO metadata table → unnecessary indirection for 3 fields

### D5: New `GET /concerts/featured` endpoint

**Decision**: Add a dedicated `GET /concerts/featured` endpoint returning featured events with banner assets, ordered by `displayOrder` then `startsAt`. Accepts optional `limit` param (default 10, max 20).

**Rationale**: The homepage needs a curated subset of events with banner data that differs from the general listing. A dedicated endpoint is cleaner than overloading `GET /concerts` with featured-only logic. The endpoint returns a slightly different shape (includes `bannerAsset`) than the standard list response.

**Alternatives considered**:
- Add `featured=true` filter to existing `GET /concerts` → conflates curated editorial content with search results; response shape differs (banner asset)
- Client-side filtering → wasteful; requires fetching all events

### D6: SEO meta rendering via react-helmet-async

**Decision**: Use `react-helmet-async` for managing `<head>` meta tags in the audience web app. Each page component sets its own meta tags via a `<Helmet>` wrapper.

**Rationale**: `react-helmet-async` is the standard React solution for declarative head management in SPAs. It's lightweight, well-maintained, and works with the existing React Router setup. For SSR/prerendering in the future, it's compatible with server-side rendering pipelines.

**Alternatives considered**:
- Manual `document.head` manipulation → brittle, no cleanup on route change
- Next.js metadata API → would require migrating from Vite + React Router

### D7: Audience homepage layout as component composition

**Decision**: Build the marketplace homepage as a composition of independent section components: `HeroBannerCarousel`, `CategoryNavBar`, `FeaturedRail`, `PopularCategories`, `CityDiscovery`, each with their own data fetching via TanStack Query hooks.

**Rationale**: Independent components with isolated data fetching allow parallel loading, independent error boundaries, and clean code organization. Each section can show its own skeleton/error state without blocking the rest of the page. This follows the existing pattern in audience-web where pages compose feature components.

**Alternatives considered**:
- Single page-level data fetch → blocks entire page on slowest query; poor UX
- Server components → requires framework migration from Vite

## Risks / Trade-offs

- **[Risk] Large homepage redesign may break existing layout** → Mitigation: build new marketplace sections as additive components; the current hero and featured sections become one variant. Feature-flag the new layout if needed during development.
- **[Risk] `eventType` default `CONCERT` silently classifies all existing events** → Mitigation: this is intentional — all existing events ARE concerts. Organizer UI for changing type is a follow-up.
- **[Risk] SEO meta tags in SPA have limited crawler support** → Mitigation: Open Graph tags work for social sharing (Facebook, Twitter, Slack) even in SPAs. For full SEO indexing, SSR/prerendering can be added later. This change provides the metadata foundation.
- **[Risk] Featured endpoint without admin UI requires direct DB edits to curate** → Mitigation: acceptable for MVP. Organizer/admin featured management is a documented non-goal and follow-up.
- **[Risk] Adding 7 columns to Concert table in one migration** → Mitigation: all columns are nullable or have defaults. Migration is additive-only, no data transformation needed. Rollback is a simple column drop.
- **[Trade-off] Keeping the `concerts` table name while broadening to multi-category** → Accepted for now to avoid a high-risk rename. Public API path `/concerts` can be aliased to `/events` in a future change if needed.
