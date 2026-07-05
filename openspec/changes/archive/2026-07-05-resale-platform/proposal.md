## Why

Resale listings are currently scoped to individual event pages (`/events/:slug/resale`), forcing users to navigate to a specific event before they can browse any resale opportunities. This severely limits discovery — similar to a P2P trading platform (OKX/Binance) that only shows order books when the user is already viewing a specific coin. Resale needs to be extracted into a standalone platform at `/resale` to maximize liquidity and improve the buyer experience.

## What Changes

- **New**: `/resale` page — global resale marketplace feed displaying all ACTIVE listings across every event, with filters for event/concert name, price range, and sort mode (trending, newest, price_asc, price_desc)
- **New**: `/resale/:listingId` page — standalone listing detail page, replacing `/events/:slug/resale/:listingId`
- **BREAKING**: Routes `/events/:slug/resale` and `/events/:slug/resale/:listingId` redirect to `/resale` and `/resale/:listingId` respectively
- **Modified**: Navbar gains a "Resale" link next to "Events"
- **Modified**: Event detail page replaces its resale tab link with a CTA banner pointing to `/resale?concertId=<id>`
- **Modified**: Backend `GET /resale/listings` gains optional filters: `search` (concert name match), `priceMin`, `priceMax` for advanced filtering
- **Modified**: Feed response includes `concertTitle`, `concertSlug`, `concertStartsAt` per listing so buyers see event context directly on the card without navigating away

## Capabilities

### New Capabilities

- `resale-platform-hub`: The `/resale` global marketplace page — multi-filter feed (concert search, price range, sort tabs), infinite scroll, real-time upvote counts via SSE, and a standalone `/resale/:listingId` detail page with comment thread, DM, and purchase flow

### Modified Capabilities

- `resale-marketplace`: Feed API gains optional filters `search`, `priceMin`, `priceMax`; feed response items include `concertTitle`, `concertSlug`, `concertStartsAt`

## Impact

- **Frontend**: 2 new routes (`/resale`, `/resale/:listingId`), 2 redirects for old routes, `PublicLayout` navbar updated, `EventDetailPage` CTA updated
- **Backend**: `GET /resale/listings` SQL query updated — concert JOIN added, optional filter WHERE clauses added; fully backwards compatible
- **Router**: `router.tsx` gains new routes and redirect entries
- **No backend breaking changes**: All new query params are optional; new response fields are additive
