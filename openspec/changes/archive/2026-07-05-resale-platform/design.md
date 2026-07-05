## Context

Resale listings are tightly coupled to event pages (`/events/:slug/resale`). Users can only discover listings when they already know which specific event to visit. The codebase already has a complete backend (feed API, SSE, DM WebSocket) and frontend components (marketplace page, listing detail, comment thread, upvote) — only routing reorganization and a feed API upgrade are needed.

## Goals / Non-Goals

**Goals:**
- Standalone `/resale` platform page displaying all ACTIVE listings across all events
- Filters: concert name search, price range, sort modes
- `/resale/:listingId` replaces `/events/:slug/resale/:listingId` — no longer depends on event `slug`
- Navbar gains a "Resale" entry point
- Feed response includes concert context (`concertTitle`, `concertSlug`, `concertStartsAt`) displayed directly on listing cards
- Backward-compatible redirects for old routes
- Event detail page retains a "View Resale Tickets" CTA but points to `/resale?concertId=<id>`

**Non-Goals:**
- No order book or price charts
- No changes to backend purchase/transfer logic
- No new authentication flows
- No mobile app

## Decisions

### 1. Route strategy: full replacement + redirect

`/events/:slug/resale` → 302 redirect to `/resale?concertId=<id>` would require fetching the concertId from the slug before redirecting. Simpler alternative: redirect straight to `/resale` and let the user filter.

**Decision:** Redirect `/events/:slug/resale` → `/resale` (no extra fetch needed). Redirect `/events/:slug/resale/:listingId` → `/resale/:listingId`.

### 2. Backend: extend existing feed SQL, no new endpoint

`GET /resale/listings` already handles the core feed — only additions needed:
- JOIN `concerts` to select `title`, `slug`, `starts_at`
- Optional WHERE clauses: `ILIKE` search on `concert.title`, `BETWEEN` for `asking_price_vnd`
- All additions are backwards compatible (params are optional)

Rationale: creating a separate `GET /resale` endpoint would duplicate logic with no benefit.

### 3. Frontend: reuse existing components, no rewrite

`ResaleMarketplacePage` → becomes `ResalePlatformPage` (global, `slug`/`concertId` not required).  
`ResaleListingDetailPage` → kept as-is; back button href becomes a prop (`backHref`) defaulting to `/resale`.  
`CommentThread` → unchanged.

### 4. Filter UI: inline filter panel, not a modal

Pattern follows Binance P2P: filters sit above the feed — search bar + price range inputs + sort tabs. Uses shadcn `Input`, `Tabs` inline — no Dialog/Sheet, keeping the listing feed always visible.

## Risks / Trade-offs

- [Redirect from `/events/:slug/resale/:listingId` requires slug] → Not needed — `/resale/:listingId` is fully independent of slug; only `listingId` is required
- [Concert name ILIKE search on large table] → Acceptable at current scale; add an index on `concerts.title` if needed as traffic grows
- [Old routes still bookmarked by users] → Redirects handle this gracefully without breaking UX

## Migration Plan

1. **Backend**: Update `getFeed()` SQL — add concert JOIN and optional filter WHERE clauses
2. **Frontend**: Create `ResalePlatformPage` and `ResalePlatformListingDetailPage` under the new routes
3. **Router**: Add `/resale` and `/resale/:listingId` routes; add redirects for old routes
4. **Navbar**: Add "Resale" link in `PublicLayout`
5. **EventDetailPage**: Update CTA button href
6. **No DB migration required**
