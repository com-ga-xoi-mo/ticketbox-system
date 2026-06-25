## Context

The `apps/audience-web` app is a React 18 + Vite SPA using React Router v6, TanStack Query v5, Tailwind CSS v4, shadcn/Radix-style local primitives, and Ant Design components. It follows a feature-driven architecture (`src/features/<domain>/`) with a centralized API client (`src/shared/api/client.ts`) that auto-attaches Bearer tokens and intercepts 401s. Authentication is client-side JWT stored in localStorage, decoded via `jwt-decode` to extract `sub` and `roles` (including `AUDIENCE`). The existing `concerts` feature module demonstrates the established patterns for pages, hooks, and API integration.

The backend `implement-artist-domain-and-api` change has landed, providing:
- `GET /public/artists` — paginated artist list with search
- `GET /public/artists/top` — top favorite artists (ranked by favoriteCount)
- `GET /public/artists/:slug` — artist profile with timeline, engagement counts, and viewer state
- `POST/DELETE /audience/artists/:id/follow` — idempotent follow/unfollow
- `POST/DELETE /audience/artists/:id/favorite` — idempotent favorite/unfavorite

All response shapes are defined in `@ticketbox/api-types` (`packages/api-types/src/artist/artist.contract.ts`) with Zod schemas: `PublicArtistListResponse`, `PublicArtistProfile`, `TopArtistListResponse`, `ArtistFollowResponse`, `ArtistFavoriteResponse`.

**Stakeholders**: Audience users (discovery, engagement), frontend team (implementation), design system (consistency with existing pages).

**Constraints**:
- Customer users use the existing `AUDIENCE` role. No `CUSTOMER` role.
- The organizer/admin `apps/web` must not be modified.
- All API response types must come from `@ticketbox/api-types` — no local-only response shapes.
- The existing `artistName` string on event cards remains unchanged; artist profile links are additive.

## Goals / Non-Goals

**Goals:**
- Add `/artists` and `/artists/:slug` public routes to the audience app with full page implementations.
- Integrate follow/favorite mutations with optimistic UI, auth gating, and idempotent backend semantics.
- Add a top artists horizontal rail to the homepage that matches the existing featured events rail pattern.
- Establish an `artists` feature module following the same conventions as `concerts`.
- Consume `@ticketbox/api-types` artist contracts exclusively — no duplicated wire types.
- Cover all UI states: loading, empty, error, not-found, unauthenticated action, and mobile responsive.

**Non-Goals:**
- No backend changes. No new API endpoints. No `@ticketbox/api-types` contract changes (unless a gap is discovered, in which case propose the minimal addition).
- No artist CMS or admin UI.
- No comments, messaging, fan posts, or artist-owned accounts.
- No changes to checkout, payment, ticketing, or existing event detail pages.
- No full-text search beyond the backend's existing ILIKE on displayName.
- No infinite scroll — use offset pagination matching the existing event list pattern.

## Decisions

### Decision 1: Feature module structure follows `concerts` convention

**Choice**: Create `src/features/artists/` with the same layout as `src/features/concerts/`:
```
src/features/artists/
  ArtistListPage.tsx          # /artists route
  ArtistProfilePage.tsx       # /artists/:slug route
  components/
    ArtistCard.tsx            # Card used in list grid and homepage rail
    ArtistProfileHero.tsx     # Profile header with avatar, poster, name, bio, counts
    ArtistTimeline.tsx        # Upcoming events list on profile
    FollowFavoriteControls.tsx # Follow/favorite toggle buttons with auth gating
    ArtistSearchBar.tsx       # Search input for artist list
    TopArtistsRail.tsx        # Horizontal scrollable rail for homepage
  hooks/
    useArtists.ts             # TanStack Query hooks for artist list, profile, top artists
    useArtistActions.ts       # TanStack Query mutations for follow/unfollow, favorite/unfavorite
```

**Rationale**: The existing `concerts` feature module uses this exact pattern — pages at the feature root, domain-specific components in `components/`, and query hooks in `hooks/`. Following the same convention keeps the codebase navigable and consistent. The `TopArtistsRail` component lives in the artists feature but is imported by the homepage — this cross-feature import is acceptable and matches how `EventCard` in `shared/ui/` is used across features.

**Alternatives considered**:
- *Put TopArtistsRail in shared/ui*: Possible, but the component is artist-domain-specific. Only move to shared if a second consumer appears beyond the homepage.
- *Flat file structure*: Loses the clear separation between pages, components, and hooks that concerts established.

### Decision 2: Artist API client layer in shared/api

**Choice**: Add `src/shared/api/artists.ts` alongside existing `catalog.ts`, `orders.ts` etc. This file contains thin fetch wrappers that call the API client and return typed responses:
```typescript
// src/shared/api/artists.ts
import type { PublicArtistListResponse, PublicArtistProfile, TopArtistListResponse, ArtistFollowResponse, ArtistFavoriteResponse } from '@ticketbox/api-types';

export function fetchArtists(params?: { q?: string; limit?: number; offset?: number }): Promise<PublicArtistListResponse> { ... }
export function fetchArtistProfile(slug: string): Promise<PublicArtistProfile> { ... }
export function fetchTopArtists(): Promise<TopArtistListResponse> { ... }
export function followArtist(artistId: string): Promise<ArtistFollowResponse> { ... }
export function unfollowArtist(artistId: string): Promise<ArtistFollowResponse> { ... }
export function favoriteArtist(artistId: string): Promise<ArtistFavoriteResponse> { ... }
export function unfavoriteArtist(artistId: string): Promise<ArtistFavoriteResponse> { ... }
```

TanStack Query hooks in `features/artists/hooks/` consume these fetchers.

**Rationale**: Matches the existing pattern where `shared/api/catalog.ts` provides fetch functions and feature hooks wrap them with `useQuery`/`useMutation`. Keeps the HTTP layer centralized and the feature layer focused on cache keys, stale times, and optimistic updates.

**Alternatives considered**:
- *Inline fetch in hooks*: Breaks the established separation; makes testing harder.
- *Shared hooks in shared/api*: The existing codebase keeps hooks in features, not in shared/api. Follow the convention.

### Decision 3: Optimistic follow/favorite with reconciliation

**Choice**: Use TanStack Query `useMutation` with `onMutate` optimistic updates for follow/favorite actions. The pattern:
1. On click, immediately toggle the UI state (button label, count ±1).
2. Fire the mutation to the backend.
3. On success, the response confirms the state — no further action needed (idempotent backend).
4. On error, roll back the optimistic update via `onError` using the snapshot from `onMutate`.
5. On settle, invalidate the artist profile query to reconcile with server truth.

**Rationale**: Follow/favorite are high-frequency, low-latency interactions. Waiting for the server response before updating the UI feels sluggish. The backend's idempotent semantics make optimistic updates safe — a duplicate POST returns success without side effects, so even if the optimistic state briefly diverges, reconciliation on settle corrects it.

**Guard against double-click**: The mutation's `isPending` state disables the button during in-flight requests. TanStack Query's built-in deduplication prevents concurrent identical mutations.

**Alternatives considered**:
- *Wait for server response*: Safe but feels slow. The user sees a delay on every click.
- *Debounce clicks*: Adds complexity without benefit since `isPending` already guards.
- *Local-only state*: Loses server reconciliation; state drifts across tabs/sessions.

### Decision 4: Anonymous user login CTA for engagement actions

**Choice**: When an unauthenticated user clicks follow or favorite, show a lightweight CTA (toast or inline prompt) directing them to `/login?returnTo=<current-path>`. Do not show a modal login form. After login, the user returns to the artist page where they can retry the action.

**Rationale**: The existing audience app redirects to `/login?returnTo=...` for all auth-gated actions (e.g., checkout). Using the same pattern keeps UX consistent. A modal login form would add complexity (managing form state in a modal, handling token storage callbacks) without clear benefit for this initial version.

The `FollowFavoriteControls` component checks `useAuth()` context. If no session, the click handler navigates to login instead of firing the mutation.

**Alternatives considered**:
- *Modal login form*: More seamless but adds significant implementation complexity. Can be added later.
- *Hide buttons for anonymous users*: Loses the engagement discovery signal; users don't know follow/favorite exists until they sign in.
- *Disable buttons with tooltip*: Less discoverable than a CTA. Users may not understand why the button is disabled.

### Decision 5: Artist list page with offset pagination

**Choice**: The artist list page uses offset pagination with `limit` and `offset` query params, matching the backend's `PublicArtistListResponse` shape (`items`, `total`, `limit`, `offset`). The URL reflects the current page via `?page=N` search params. Search is via `?q=<term>` combined with pagination.

**Rationale**: The existing event list page (`EventListPage.tsx`) uses the same offset pagination pattern. The backend artist list endpoint returns `total`, `limit`, `offset` — perfectly suited for page-based navigation. Cursor pagination would require backend changes and adds complexity for a catalog that doesn't need real-time consistency.

The search input is debounced (300ms) to avoid excessive API calls. Typing resets pagination to page 1.

**Alternatives considered**:
- *Infinite scroll*: The event list doesn't use it. Inconsistent UX. Also harder to share/bookmark specific pages.
- *Cursor pagination*: Backend doesn't support it for artists. Would require API changes (non-goal).

### Decision 6: Artist profile page layout

**Choice**: The artist profile page uses a hero section with the poster/cover image as a full-width background (with gradient overlay) and the avatar + name + bio + engagement controls overlaid. Below the hero, an event timeline section shows upcoming concerts as cards linking to `/events/:slug`.

Layout structure:
- **Hero banner**: Poster image as background (fallback to gradient if no poster). Avatar (circular, overlapping the banner bottom), display name, bio text, follower count, favorite count, follow button, favorite button.
- **Timeline section**: "Upcoming Events" heading with event cards in a responsive grid. Each card shows poster, title, venue, city, date, event type. Links to existing `/events/:slug` route. If no upcoming events, show empty state with past event count context.
- **Responsive**: On mobile, hero stacks vertically. On desktop, hero is full-width with content centered.

**Rationale**: This layout is standard for artist/musician profile pages (Ticketbox.vn, Spotify artist page pattern). The poster-as-hero approach creates visual impact. Using existing `EventCard` (or a minimal variant) for timeline cards reuses proven UI. Linking to `/events/:slug` keeps navigation within the established audience app flow.

**Alternatives considered**:
- *Side-by-side layout (avatar left, info right)*: Less visually impactful for a discovery/engagement page. Better suited for settings/account pages.
- *Tab-based layout (upcoming/past/about)*: Over-engineered for the initial version. Past events are a count only (no inline listing). Tabs can be added when past event pagination is implemented.

### Decision 7: Homepage top artists rail integration

**Choice**: Add a `TopArtistsRail` section to the homepage (`HomePage.tsx`) positioned after the featured events section and before the city tabs section (or at a natural visual break). The rail uses the same horizontal scroll pattern as the existing featured events rail:
- Horizontal scrollable container with scroll snap
- Navigation arrows on desktop, swipe on mobile
- Each card shows avatar (circular), display name, favorite count
- Cards link to `/artists/:slug`
- Loading state shows skeleton cards matching the rail dimensions

The data source is `GET /public/artists/top` via a `useTopArtists()` query hook.

**Rationale**: The homepage already has horizontal rail infrastructure for featured events. Reusing the same scroll/snap pattern keeps the homepage visually consistent. The top artists rail is a lightweight addition — a single query hook and a row of small artist cards. Placing it after featured events gives artists visibility without displacing the primary event discovery flow.

**Alternatives considered**:
- *Grid layout instead of rail*: Takes too much vertical space on the homepage. Rails are standard for secondary discovery surfaces.
- *Embed artist info in event cards*: The existing event cards use `artistName` strings. Adding artist profile links to event cards is a larger change that affects the shared `EventCard` component. Deferred to a future change.

### Decision 8: Routing strategy

**Choice**: Add two new routes to `src/app/router.tsx`:
```typescript
{ path: '/artists', element: <ArtistListPage /> },
{ path: '/artists/:slug', element: <ArtistProfilePage /> },
```

Both routes are public (no auth guard). They render inside the existing `PublicLayout` shell. Lazy loading with `React.lazy` follows the pattern used for account routes.

**Rationale**: `/artists` and `/artists/:slug` are natural URL patterns matching the existing `/events` and `/events/:slug` convention. Public routes (no auth required) because artist discovery is open to all visitors. Lazy loading reduces initial bundle size since artist pages are secondary to the primary event discovery flow.

**Alternatives considered**:
- *Nested under /events/artists*: Confusing URL hierarchy. Artists are a separate entity, not a sub-resource of events.
- *Using /artist (singular)*: The existing convention uses `/events` (plural). Follow the pattern: `/artists`.

### Decision 9: Query key and cache strategy

**Choice**: TanStack Query keys follow a hierarchical namespace convention:
```typescript
const artistKeys = {
  all: ['artists'] as const,
  lists: () => [...artistKeys.all, 'list'] as const,
  list: (params: { q?: string; page?: number }) => [...artistKeys.lists(), params] as const,
  profiles: () => [...artistKeys.all, 'profile'] as const,
  profile: (slug: string) => [...artistKeys.profiles(), slug] as const,
  top: () => [...artistKeys.all, 'top'] as const,
};
```

Stale time: 30 seconds (matches the global TanStack Query config). Follow/favorite mutations invalidate `artistKeys.profile(slug)` on settle. The top artists query is also invalidated on favorite/unfavorite since favorite count affects the ranking.

**Rationale**: Hierarchical keys enable targeted invalidation. After a favorite action, invalidating the profile query refreshes the viewer state and counts. Invalidating the top artists query ensures the homepage rail reflects updated rankings. The 30-second stale time matches the existing global config — no special casing needed.

**Alternatives considered**:
- *Longer stale time for artist profiles*: Artist profiles change infrequently, but the viewer's follow/favorite state changes immediately. The 30-second default is fine; mutations trigger explicit invalidation for freshness.
- *Manual cache updates instead of invalidation*: More complex to maintain. Invalidation is simpler and the extra network request is acceptable given the low frequency of follow/favorite actions.

### Decision 10: Missing API contract assessment

**Choice**: After reviewing the existing `@ticketbox/api-types` artist contracts, no additions are needed. The `ArtistSearchParamsSchema` (q, limit, offset) is already defined. All response shapes are complete.

If during implementation a gap is found (e.g., a missing export, a schema that needs adjustment), the fix should be a minimal `@ticketbox/api-types` patch — not a local type definition in the audience app.

**Rationale**: The backend change was designed with this frontend change in mind. The contracts are comprehensive. Maintaining the single-source-of-truth principle for wire types prevents drift between frontend expectations and backend responses.

## Risks / Trade-offs

**[Optimistic UI flicker on slow networks]** → If the follow/favorite mutation fails after optimistic update, the UI briefly shows the wrong state before rolling back. **Mitigation**: The rollback happens in `onError`, which is near-instant. The brief flicker is acceptable and standard practice for optimistic UX. A toast notification on error informs the user.

**[Homepage rail shows stale rankings]** → The top artists rail uses a 30-second stale time. After a favorite action, the rail may briefly show outdated rankings until invalidation completes. **Mitigation**: Invalidate the top artists query on favorite/unfavorite mutations. For cross-tab staleness, the 30-second window is acceptable.

**[Artist pages increase bundle size]** → Two new pages with components add to the JS bundle. **Mitigation**: Lazy load both artist routes with `React.lazy`, keeping them out of the critical path for homepage and event detail.

**[Backend artist data may be sparse initially]** → If few artists are seeded or created, the artist list and homepage rail may look empty. **Mitigation**: Implement quality empty states that gracefully handle zero results. The seed script from the backend change creates demo artists, so development environments will have data.

**[Concert timeline cards link to event detail]** → The artist profile shows upcoming events as cards linking to `/events/:slug`. If the backend's `PublicArtistTimelineEvent` shape differs from what `EventCard` expects, an adapter or dedicated `TimelineEventCard` component is needed. **Mitigation**: The timeline event schema includes all fields needed for a card (title, posterAsset, venueName, city, startsAt, eventType). A lightweight `TimelineEventCard` specific to the artist profile avoids coupling to the shared `EventCard` which may have catalog-specific dependencies.

**[No past events pagination]** → The artist profile shows `pastEventCount` but does not list past events. Users may expect to browse past events. **Mitigation**: Show the count as "N past events" text. A paginated past events tab can be added in a follow-up change when the backend supports `?timeline=past` with pagination.
