## Why

The backend artist domain and APIs are now in place (`implement-artist-domain-and-api`), providing public artist listing, profile, top artists, and AUDIENCE follow/favorite endpoints with full `@ticketbox/api-types` contracts. However, the audience web app has no artist-facing UI — artists still appear only as a plain `artistName` string on event cards. Without dedicated artist pages, audience users cannot discover artists, view artist profiles, browse artist event timelines, or follow/favorite artists. Adding artist discovery UI to `apps/audience-web` completes the audience-facing half of the artist feature and unlocks engagement that drives repeat visits and homepage personalization.

## What Changes

- **Artist list page (`/artists`)**: New public route displaying active artists in a searchable, paginated grid with avatar, name, favorite count, and links to artist profiles. Includes search input, loading skeletons, empty state, and error state. Anonymous users can browse; authenticated AUDIENCE users can follow/favorite from artist cards.
- **Artist profile page (`/artists/:slug`)**: New public route showing the full artist profile — avatar, poster/cover image, name, bio, follower/favorite counts, follow/favorite controls, and an upcoming event timeline. Timeline cards link to existing audience event detail pages. Past event count is displayed. Draft/cancelled events are hidden per backend contract.
- **Follow/favorite UX**: Optimistic toggle controls for follow and favorite actions. Anonymous users see a login CTA. Authenticated AUDIENCE users toggle with immediate UI feedback and backend reconciliation. Duplicate-click and in-flight guards prevent double-action.
- **Homepage top artists rail**: Horizontal scrollable rail of top favorite artists on the audience homepage, sourced from `GET /public/artists/top`. Artist cards link to `/artists/:slug`. Responsive layout matching existing homepage rail patterns.
- **Artist API client layer**: New API fetcher functions and TanStack Query hooks for artist list, artist profile, top artists, follow, unfollow, favorite, and unfavorite — consuming `@ticketbox/api-types` contracts.

## Capabilities

### New Capabilities
- `audience-artist-pages`: Covers the audience web artist list page, artist profile page, follow/favorite UX, homepage top artists rail, artist API client hooks, and all associated loading/empty/error/auth states.

### Modified Capabilities
- `audience-homepage-discovery`: The homepage gains a "Top Artists" horizontal rail section sourced from the top favorite artists API.
- `artist-discovery`: Frontend consumption requirements are added — the audience web app consumes public artist list, profile, top artists, and AUDIENCE follow/favorite endpoints defined in this spec.

## Impact

- **Frontend (`apps/audience-web`)**: New `src/features/artists/` feature module with pages, components, hooks, and API functions. New route entries in `src/app/router.tsx`. New shared UI components (ArtistCard, ArtistRail) in feature or shared directories. Homepage component updated to include top artists rail.
- **Shared contracts**: Consumes existing `@ticketbox/api-types` artist contracts. No new backend endpoints or contract changes expected unless a gap is discovered (e.g., missing search query param schema), in which case a minimal contract addition is proposed rather than local-only types.
- **Routing**: Two new public routes (`/artists`, `/artists/:slug`) added to the audience app router. No changes to organizer/admin `apps/web` routing.
- **Dependencies**: No new npm dependencies expected — the feature uses existing TanStack Query, React Router, shadcn/Radix UI primitives, Ant Design components, Tailwind CSS, and lucide-react icons already in the audience app.
- **Existing behavior**: No changes to event detail, checkout, account, or organizer/admin pages. The existing `artistName` rendering on event cards remains unchanged.
