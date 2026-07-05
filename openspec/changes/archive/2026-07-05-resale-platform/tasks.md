## 1. Backend — Feed API Extension

- [x] 1.1 Update `getFeed()` in `prisma-resale-listing.repository.ts`: JOIN `concerts` table to select `title`, `slug`, `starts_at`; alias as `concertTitle`, `concertSlug`, `concertStartsAt` in the SELECT clause
- [x] 1.2 Add optional WHERE clause for `search`: append `AND c.title ILIKE $N` when the `search` param is provided
- [x] 1.3 Add optional WHERE clauses for `priceMin` / `priceMax`: append `AND l.asking_price_vnd >= $N` and `AND l.asking_price_vnd <= $N` when provided
- [x] 1.4 Update `GetFeedUseCase` and controller `getFeedAction` to accept `@Query('search')`, `@Query('priceMin')`, `@Query('priceMax')` and pass them down to the repository
- [x] 1.5 **Verify**: Call `GET /resale/listings` — confirm each item has `concertTitle`, `concertSlug`, `concertStartsAt`. Call with `?search=anh` — confirm only listings from matching concerts are returned. Call with `?priceMin=100000&priceMax=500000` — confirm price range filter is applied correctly.

## 2. Frontend — Resale Platform Pages

- [x] 2.1 Create `apps/audience-web/src/features/resale/ResalePlatformPage.tsx` — global feed, `slug`/`concertId` not required; reads `?concertId` from URL search params to pre-filter if present
- [x] 2.2 Implement filter panel in `ResalePlatformPage`: debounced search input (400ms), price range inputs (min/max), sort tabs (Trending / Newest / Price ↑ / Price ↓)
- [x] 2.3 Listing card displays concert context: `concertTitle` + formatted `concertStartsAt`, alongside seller info, price, upvote count, and comment count
- [x] 2.4 Wire upvote button on listing card (reuse `useToggleUpvote`)
- [x] 2.5 Create `apps/audience-web/src/features/resale/ResalePlatformListingDetailPage.tsx` — wraps the existing `ResaleListingDetailPage` but with back button pointing to `/resale`; or refactor `ResaleListingDetailPage` to accept `backHref` as a prop
- [x] 2.6 Update `shared/api/resale.ts` — extend `useResaleFeed` hook to accept `search?: string`, `priceMin?: number`, `priceMax?: number`

## 3. Router — New Routes and Redirects

- [x] 3.1 Add route `/resale` → `ResalePlatformPage` in `router.tsx`
- [x] 3.2 Add route `/resale/:listingId` → `ResalePlatformListingDetailPage` in `router.tsx`
- [x] 3.3 Add redirect `/events/:slug/resale` → `/resale` (use `<Navigate>` or a loader redirect)
- [x] 3.4 Add redirect `/events/:slug/resale/:listingId` → `/resale/:listingId`

## 4. Navigation — Navbar and Event Detail CTA

- [x] 4.1 Add "Resale" link to `NavLinks` in `PublicLayout.tsx`, positioned next to "Events", pointing to `/resale`
- [x] 4.2 Update `EventDetailPage.tsx`: change the "View Resale Tickets" CTA button href from `/events/${slug}/resale` to `/resale?concertId=${concert.id}`

## 5. End-to-End Verification

- [x] 5.1 **Verify**: Navigate to `/resale` — feed shows listings from all events; concert search filter, price range filter, and sort tabs all work correctly
- [x] 5.2 **Verify**: Navigate to `/resale/:listingId` — listing detail page is fully functional (SSE upvote, comments, DM, purchase)
- [x] 5.3 **Verify**: Navigate to `/events/:slug/resale` — redirects to `/resale`; navigate to `/events/:slug/resale/:listingId` — redirects to `/resale/:listingId`
- [x] 5.4 **Verify**: Navbar shows "Resale" link; event detail page CTA points to the correct URL
- [x] 5.5 **Verify**: `npm run build` (backend) and `tsc --noEmit` (frontend) — no errors
