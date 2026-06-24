## 1. Shared API Contracts (packages/api-types)

- [ ] 1.1 Add `CatalogSearchParamsSchema` to `packages/api-types/src/catalog/public-concert.contract.ts` with optional fields: `q` (string), `city` (string), `sortBy` (enum: `date`, `price`), `sortDir` (enum: `asc`, `desc`). Export the schema and inferred type from the package index.
- [ ] 1.2 Add `PublicConcertCitiesResponseSchema` (`z.array(z.string())`) to the same contract file. Export the schema and inferred type from the package index.
- [ ] 1.3 Run `npm run build:api-types` and verify the new schemas are exported without type errors.

## 2. Backend Catalog Search API (packages/backend)

- [ ] 2.1 Add a `CatalogSearchFilters` type to `packages/backend/src/concert-management/domain/catalog.types.ts` with optional fields: `q`, `city`, `sortBy`, `sortDir`.
- [ ] 2.2 Update `PublicConcertCatalogPort.listUpcomingPublished` signature to accept `(now: Date, filters?: CatalogSearchFilters)` in `packages/backend/src/concert-management/domain/ports/public-concert-catalog.port.ts`.
- [ ] 2.3 Add `listDistinctCities(now: Date): Promise<string[]>` method to `PublicConcertCatalogPort`.
- [ ] 2.4 Update `PrismaPublicConcertCatalogRepository.listUpcomingPublished` to apply Prisma `where` conditions for `q` (case-insensitive `contains` on `title` OR `artistName`) and `city` (exact match), and `orderBy` for `sortBy`/`sortDir` (date maps to `startsAt`, price maps to min ticket type price via a subquery or post-sort).
- [ ] 2.5 Implement `PrismaPublicConcertCatalogRepository.listDistinctCities` using Prisma `findMany` with `distinct: ['city']` and `select: { city: true }`, filtered by `publicConcertWhere(now)`, ordered alphabetically.
- [ ] 2.6 Update `ListPublicConcertsUseCase.execute` to accept and pass through the optional `CatalogSearchFilters` parameter to the port.
- [ ] 2.7 Create `ListConcertCitiesUseCase` in `packages/backend/src/concert-management/application/use-cases/` that calls `catalog.listDistinctCities(now)`.
- [ ] 2.8 Update `PublicConcertCatalogController.listConcerts` to accept `@Query()` parameters (`q`, `city`, `sortBy`, `sortDir`), validate with `CatalogSearchParamsSchema`, and pass to the use case.
- [ ] 2.9 Add `GET /concerts/cities` route to `PublicConcertCatalogController` that calls `ListConcertCitiesUseCase` and returns `string[]`.
- [ ] 2.10 Register `ListConcertCitiesUseCase` as a provider in the concert management module.
- [ ] 2.11 Write unit tests for `ListPublicConcertsUseCase` with filter params and `ListConcertCitiesUseCase`.
- [ ] 2.12 Write integration/e2e test for `GET /concerts?q=...&city=...&sortBy=...&sortDir=...` and `GET /concerts/cities`.

## 3. Audience Web — New shadcn/ui Primitives

- [ ] 3.1 Install shadcn `tabs` component into `apps/audience-web/src/components/ui/tabs.tsx`.
- [ ] 3.2 Install shadcn `select` component into `apps/audience-web/src/components/ui/select.tsx`.
- [ ] 3.3 Install shadcn `popover` component into `apps/audience-web/src/components/ui/popover.tsx`.
- [ ] 3.4 Install shadcn `dialog` component into `apps/audience-web/src/components/ui/dialog.tsx`.
- [ ] 3.5 Verify all new primitives render without errors by running `npm run verify:audience-web`.

## 4. Audience Web — API Client & Query Hooks

- [ ] 4.1 Update `fetchConcertList` in `apps/audience-web/src/shared/api/catalog.ts` to accept optional `CatalogSearchParams` and append non-empty params as URL query string to `GET /concerts`.
- [ ] 4.2 Add `fetchConcertCities` function that calls `GET /concerts/cities` and parses response with `PublicConcertCitiesResponseSchema`.
- [ ] 4.3 Update `catalogKeys` to include `cities()` and make `list(params?)` include filter params in the query key for proper cache keying.
- [ ] 4.4 Create `useConcertList(params)` custom hook in `apps/audience-web/src/shared/api/catalog.ts` (or a new hooks file) that wraps `useQuery` with `catalogKeys.list(params)` and `fetchConcertList(params)`.
- [ ] 4.5 Create `useConcertCities()` custom hook that wraps `useQuery` with `catalogKeys.cities()` and `fetchConcertCities`.
- [ ] 4.6 Write unit tests for the updated `fetchConcertList` with params and `fetchConcertCities`.

## 5. Audience Web — Extended Page States

- [ ] 5.1 Add `PageNoResults` component to `apps/audience-web/src/shared/ui/PageStates.tsx` that displays a contextual "no results" message with a "Clear filters" action callback.
- [ ] 5.2 Add `PageSoldOut` component that displays a sold-out banner suitable for embedding in the event detail page.
- [ ] 5.3 Add `PageUnavailable` component that displays an unavailable/ended event state with a link back to the event listing.
- [ ] 5.4 Write tests for the new page state components.

## 6. Audience Web — Homepage Discovery

- [ ] 6.1 Refactor `HomePage.tsx` hero section to use the first concert from the API response as the dynamic featured event, displaying its poster, title, artist, venue, city, date, and a CTA link to its detail page.
- [ ] 6.2 Add a search bar to the hero section that navigates to `/events?q=<term>` on submit using `useNavigate`.
- [ ] 6.3 Add a graceful fallback hero when no concerts are available (branded message + CTA to `/events`).
- [ ] 6.4 Integrate `useConcertCities()` hook and render city discovery tabs (using shadcn `tabs`) above the featured events section, with "All" as the default tab.
- [ ] 6.5 Implement client-side city filtering of the featured events section when a city tab is selected (filter the already-fetched concert list).
- [ ] 6.6 Hide city tabs when only one city is available.
- [ ] 6.7 Ensure responsive layout: single-column stacked hero on mobile, two-column hero on desktop; 1/2/3-column event grid across breakpoints.
- [ ] 6.8 Write tests for HomePage: dynamic hero rendering, search bar navigation, city tab filtering, loading/error states.

## 7. Audience Web — Event Listing with Search/Filter/Sort

- [ ] 7.1 Add a filter toolbar to `EventListPage.tsx` with: text search input, city filter (shadcn `select` populated from `useConcertCities()`), sort dropdown (shadcn `select` with date/price options).
- [ ] 7.2 Sync filter/sort state to URL search params using `useSearchParams` from react-router-dom. Restore state from URL on mount.
- [ ] 7.3 Replace the current `fetchConcertList()` call with `useConcertList(params)` that passes URL search params as API query parameters.
- [ ] 7.4 Render `PageNoResults` when the filtered query returns zero results, with the search term or city name in the message and a "Clear filters" action.
- [ ] 7.5 Ensure the existing `PageLoading` and `PageError` states work correctly with filtered queries.
- [ ] 7.6 Ensure responsive layout: stacked filter controls on mobile, inline horizontal toolbar on desktop.
- [ ] 7.7 Write tests for EventListPage: filter/sort URL sync, API calls with params, no-results state, clearing filters.

## 8. Audience Web — Event Detail Enrichment

- [ ] 8.1 Add artist bio section to `EventDetailPage.tsx` that renders `publishedArtistBio` with multi-paragraph support when present, hidden when null.
- [ ] 8.2 Add seating zone legend section that renders each zone's label, color indicator, and per-zone available ticket count (computed from `ticketTypeZoneMappings` and ticket type availability). Hidden when `seatingZones` is empty.
- [ ] 8.3 Add seating map image display that renders `seatingMapAsset` as an `<img>` near the zone legend, resolving via `publicUrl` with fallback to `/assets/:id`. Hidden when null.
- [ ] 8.4 Create a `getSaleWindowState(ticketType, now)` utility function returning `'upcoming' | 'on-sale' | 'ended'` based on `saleStartsAt`, `saleEndsAt`, and current time.
- [ ] 8.5 Add sale window state indicators to each ticket type row: "Sale starts on [date]" badge for upcoming, "On sale" badge for active, "Sale ended" badge for ended, "Temporarily unavailable" badge for PAUSED status.
- [ ] 8.6 Disable the quantity selector (+/- buttons) for ticket types that are not on-sale, paused, sold-out, or sale-ended.
- [ ] 8.7 Implement functional ticket quantity state using `useState<Map<string, number>>`. Wire +/- buttons to increment/decrement, respecting `maxPerUser` and `availableQuantity` bounds. Disable buttons at bounds.
- [ ] 8.8 Add per-ticket-type sold-out badge when `status === 'SOLD_OUT'` or `availableQuantity === 0`.
- [ ] 8.9 Add full-page sold-out banner (using `PageSoldOut`) when all ticket types have `availableQuantity === 0`. Disable the primary CTA button.
- [ ] 8.10 Handle 404 response from `GET /concerts/:slug` by rendering `PageUnavailable` with a link back to `/events`.
- [ ] 8.11 Ensure responsive layout: stacked poster-above-content on mobile (< 1024px), sticky poster left + scrolling content right on desktop.
- [ ] 8.12 Write tests for EventDetailPage: artist bio rendering, zone legend, sale window states, quantity selector bounds, sold-out states, 404 handling.

## 9. Verification & Polish

- [ ] 9.1 Run `npm run verify:audience-web` (typecheck + tests) and fix any failures.
- [ ] 9.2 Run `npm run dev:audience-web` and manually verify: homepage search bar navigates to `/events?q=...`, city tabs filter events, featured hero uses real data.
- [ ] 9.3 Manually verify event listing: search/city/sort filters work, URL params sync, no-results state displays correctly.
- [ ] 9.4 Manually verify event detail: artist bio renders, seating zones/map display, sale window badges show correctly, quantity selector respects bounds, sold-out state works.
- [ ] 9.5 Test responsive behavior at mobile (375px), tablet (768px), and desktop (1440px) viewport widths for all three pages.
- [ ] 9.6 Run backend API tests to ensure `GET /concerts` with query params and `GET /concerts/cities` pass.
