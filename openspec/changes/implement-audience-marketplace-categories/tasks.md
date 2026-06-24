## 1. Database Schema & Migration

- [ ] 1.1 Add `EventType` enum to Prisma schema with values `CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER` mapped to `event_type`
- [ ] 1.2 Add `eventType` field to Concert model with `@default(CONCERT)` and `@map("event_type")`
- [ ] 1.3 Add `isFeatured` boolean field to Concert model with `@default(false)` and `@map("is_featured")`
- [ ] 1.4 Add `bannerAssetId` optional UUID field to Concert model with FK relation to Asset (`onDelete: SetNull`) and `@map("banner_asset_id")`
- [ ] 1.5 Add `displayOrder` integer field to Concert model with `@default(0)` and `@map("display_order")`
- [ ] 1.6 Add `seoTitle` optional varchar(160) field to Concert model with `@map("seo_title")`
- [ ] 1.7 Add `seoDescription` optional varchar(320) field to Concert model with `@map("seo_description")`
- [ ] 1.8 Add `seoImageUrl` optional text field to Concert model with `@map("seo_image_url")`
- [ ] 1.9 Add composite index `@@index([isFeatured, displayOrder, startsAt])` for featured queries
- [ ] 1.10 Run `npx prisma migrate dev` to generate and apply the migration; verify it is additive-only (no drops/renames)

## 2. Shared API Contracts (`packages/api-types`)

- [ ] 2.1 Add `EventTypeCodeSchema` Zod enum (`CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER`) and export `EventTypeCode` type
- [ ] 2.2 Add `eventType` field (`EventTypeCodeSchema`) to `PublicConcertSummarySchema`
- [ ] 2.3 Add `seoTitle` (nullable string), `seoDescription` (nullable string), `seoImageUrl` (nullable string) to `PublicConcertDetailResponseSchema`
- [ ] 2.4 Add `eventType` field to `PublicConcertDetailResponseSchema` (inherited from summary extension)
- [ ] 2.5 Create `PublicFeaturedConcertSchema` extending `PublicConcertSummarySchema` with `bannerAsset` (nullable `PublicAssetSchema`), `displayOrder` (int)
- [ ] 2.6 Create `PublicFeaturedConcertListResponseSchema` as `z.array(PublicFeaturedConcertSchema)` and export types
- [ ] 2.7 Create `FeaturedConcertParamsSchema` with optional `limit` (positive integer, coerced) and export
- [ ] 2.8 Add optional `eventType` field (`EventTypeCodeSchema.optional()`) to `CatalogSearchParamsSchema`
- [ ] 2.9 Export all new schemas and types from the package entrypoint (`index.ts`)
- [ ] 2.10 Build the package (`npm run build -w @ticketbox/api-types`) and verify no type errors

## 3. Backend Catalog Domain & Use Cases

- [ ] 3.1 Add `eventType` to `CatalogSearchFilters` domain type in `catalog.types.ts`
- [ ] 3.2 Update `ListPublicConcertsUseCase` to accept and apply `eventType` filter in Prisma query (where clause)
- [ ] 3.3 Update the public concert list mapper to include `eventType` in the summary response
- [ ] 3.4 Update the public concert detail mapper to include `eventType`, `seoTitle`, `seoDescription`, `seoImageUrl` in the detail response
- [ ] 3.5 Create `ListFeaturedConcertsUseCase` — query published upcoming concerts where `isFeatured = true`, ordered by `displayOrder` asc then `startsAt` asc, with configurable limit (default 10, max 20)
- [ ] 3.6 Create a featured concert mapper that maps Concert + banner Asset relation to `PublicFeaturedConcert` response shape

## 4. Backend HTTP Controller Updates

- [ ] 4.1 Update `PublicConcertCatalogController.listConcerts` to parse and pass `eventType` from query params to use case
- [ ] 4.2 Add `GET /concerts/featured` route to `PublicConcertCatalogController` — parse `FeaturedConcertParamsSchema`, call `ListFeaturedConcertsUseCase`, return response
- [ ] 4.3 Ensure the `featured` route is registered before the `:slug` param route to avoid route conflict
- [ ] 4.4 Register `ListFeaturedConcertsUseCase` in the concert-management NestJS module providers

## 5. Backend Contract Tests

- [ ] 5.1 Add contract test for `GET /concerts?eventType=CONCERT` — verify response validates against updated `PublicConcertListResponseSchema`
- [ ] 5.2 Add contract test for `GET /concerts/featured` — verify response validates against `PublicFeaturedConcertListResponseSchema`
- [ ] 5.3 Add contract test for `GET /concerts/:slug` — verify response includes `eventType` and SEO fields, validates against updated `PublicConcertDetailResponseSchema`
- [ ] 5.4 Add unit tests for `ListFeaturedConcertsUseCase` (featured filter, ordering, limit capping)
- [ ] 5.5 Verify existing catalog tests still pass after schema changes

## 6. Audience Web — API Client & Hooks

- [ ] 6.1 Add `fetchFeaturedConcerts` function to `apps/audience-web/src/shared/api/catalog.ts` calling `GET /concerts/featured` and validating with `PublicFeaturedConcertListResponseSchema`
- [ ] 6.2 Add `useFeaturedConcerts` TanStack Query hook with appropriate query key
- [ ] 6.3 Update `CatalogSearchParams` type usage to include `eventType` in `fetchConcertList` params
- [ ] 6.4 Add `catalogKeys.featured` query key to the catalog keys factory

## 7. Audience Web — SEO Integration

- [ ] 7.1 Install `react-helmet-async` dependency in `apps/audience-web`
- [ ] 7.2 Wrap the app root (in `main.tsx` or around `RouterProvider`) with `HelmetProvider`
- [ ] 7.3 Create a reusable `SeoHead` component that accepts title, description, image, url, type props and renders `<Helmet>` with Open Graph and Twitter Card meta tags
- [ ] 7.4 Add `<SeoHead>` to `EventDetailPage` with SEO field values and fallbacks to title/description/posterAsset
- [ ] 7.5 Add `<SeoHead>` to `EventListPage` with dynamic title/description based on active filters (eventType, city)
- [ ] 7.6 Add `<SeoHead>` to `HomePage` with marketplace landing page meta tags

## 8. Audience Web — Homepage Marketplace Redesign

- [ ] 8.1 Create `HeroBannerCarousel` component — fetches from `useFeaturedConcerts`, renders carousel slides with banner/poster images, event info overlay, CTA links, auto-advance (5s), navigation dots, skeleton/fallback states
- [ ] 8.2 Create `CategoryNavBar` component — horizontal bar with icon + label for each `EventTypeCode`, links to `/events?eventType=<TYPE>`, horizontally scrollable on mobile, centered row on desktop
- [ ] 8.3 Create `FeaturedEventRail` component — horizontally scrollable rail of up to 10 event cards from `useConcertList`, with event type badge on each card, navigation arrows on desktop, swipe on mobile, skeleton/error states
- [ ] 8.4 Create `PopularCategoriesGrid` component — grid of category cards (icon, name, description) linking to `/events?eventType=<TYPE>`, responsive 2/3/6-column layout
- [ ] 8.5 Create `CityDiscoverySection` component — city pills from `useConcertCities` linking to `/events?city=<CITY>`, date shortcut buttons ("This weekend", "This month", "Next month") computing ISO date ranges, skeleton states
- [ ] 8.6 Refactor `HomePage` to compose: `HeroBannerCarousel`, `CategoryNavBar`, `FeaturedEventRail`, `PopularCategoriesGrid`, `CityDiscoverySection` in order, replacing the current single-hero + flat-featured layout
- [ ] 8.7 Ensure each homepage section loads independently with isolated loading/error boundaries

## 9. Audience Web — Event Listing Updates

- [ ] 9.1 Add `EventTypeFilter` component — horizontal chip/tab bar with "All" + each event type, active chip styling, click handler that updates URL `eventType` param
- [ ] 9.2 Integrate `EventTypeFilter` into `EventListPage` filter toolbar, above or alongside existing search/city/date/price filters
- [ ] 9.3 Update `EventListPage` URL sync logic to read/write `eventType` search param and include in API calls
- [ ] 9.4 Update event card component to display an `eventType` badge (colored pill with category label)
- [ ] 9.5 Update no-results empty state to mention the active event type filter (e.g., "No workshops found")

## 10. Audience Web — Event Detail Updates

- [ ] 10.1 Display event type badge near the event title on `EventDetailPage`
- [ ] 10.2 Verify `EventDetailPage` correctly renders the new `eventType` field from the updated detail response

## 11. Verification & Cleanup

- [ ] 11.1 Run full backend test suite and verify all tests pass (`npm test` in backend workspace)
- [ ] 11.2 Run `npm run build` for `@ticketbox/api-types`, backend, and audience-web — verify no type errors
- [ ] 11.3 Run audience-web dev server and manually verify: homepage marketplace layout, category navigation, featured carousel, event listing with eventType filter, event detail with SEO meta tags and type badge
- [ ] 11.4 Verify responsive behavior: mobile (< 640px), tablet (640-1023px), desktop (>= 1024px) for homepage and event listing
- [ ] 11.5 Verify URL-based filter state: navigate to `/events?eventType=WORKSHOP&city=HCMC` and confirm all filters are restored and applied
