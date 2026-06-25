## 1. Artist API Client Layer

- [ ] 1.1 Create `src/shared/api/artists.ts` with typed fetch wrappers for all artist endpoints: `fetchArtists(params?)`, `fetchArtistProfile(slug)`, `fetchTopArtists()`, `followArtist(id)`, `unfollowArtist(id)`, `favoriteArtist(id)`, `unfavoriteArtist(id)`. Use existing `apiGet`/`apiPost`/`apiDelete` from `client.ts`. Import response types from `@ticketbox/api-types`.
- [ ] 1.2 Verify `@ticketbox/api-types` exports `ArtistSearchParamsSchema` or equivalent. If the search query param type is missing from the package export, add the minimal export to `packages/api-types/src/index.ts` and rebuild.

## 2. TanStack Query Hooks

- [ ] 2.1 Create `src/features/artists/hooks/useArtists.ts` with `useArtists(params)` hook wrapping `fetchArtists` in `useQuery`. Use query key factory: `['artists', 'list', params]`. Accept `{ q?: string; page?: number }` and derive `limit`/`offset` from page number.
- [ ] 2.2 Create `src/features/artists/hooks/useArtistProfile.ts` with `useArtistProfile(slug)` hook wrapping `fetchArtistProfile` in `useQuery`. Use query key `['artists', 'profile', slug]`. Enable only when slug is truthy.
- [ ] 2.3 Create `src/features/artists/hooks/useTopArtists.ts` with `useTopArtists()` hook wrapping `fetchTopArtists` in `useQuery`. Use query key `['artists', 'top']`.
- [ ] 2.4 Create `src/features/artists/hooks/useArtistActions.ts` with `useFollowArtist(slug)` and `useFavoriteArtist(slug)` mutation hooks. Each mutation SHALL: (a) optimistically update the artist profile query cache in `onMutate`, (b) snapshot previous data for rollback, (c) roll back in `onError`, (d) invalidate `['artists', 'profile', slug]` and `['artists', 'top']` in `onSettled`.
- [ ] 2.5 Export a `artistKeys` query key factory object from a shared location in the hooks directory for consistent key management across all artist hooks.

## 3. Artist Feature Module Structure

- [ ] 3.1 Create directory structure: `src/features/artists/`, `src/features/artists/components/`, `src/features/artists/hooks/`
- [ ] 3.2 Create barrel export `src/features/artists/index.ts` exporting `ArtistListPage` and `ArtistProfilePage` as lazy-loadable components.

## 4. Artist Card Component

- [ ] 4.1 Create `src/features/artists/components/ArtistCard.tsx` — a card component displaying artist avatar (circular, with fallback to initials/icon), display name, and favorite count. The card links to `/artists/:slug`. Uses shadcn `Card` primitive and Tailwind for layout.
- [ ] 4.2 Add responsive sizing: compact variant for homepage rail (smaller avatar, single-line name) and standard variant for list grid (larger avatar, name + favorite count).

## 5. Artist List Page

- [ ] 5.1 Create `src/features/artists/ArtistListPage.tsx` rendering a searchable, paginated grid of `ArtistCard` components. Read `q` and `page` from URL search params via `useSearchParams`. Pass params to `useArtists` hook.
- [ ] 5.2 Create `src/features/artists/components/ArtistSearchBar.tsx` — a search input with 300ms debounce that updates the URL `?q=` param and resets page to 1 on input change. Use shadcn `Input` or Ant Design `Input.Search`.
- [ ] 5.3 Implement pagination controls on artist list page using Ant Design `Pagination` component. Derive `current` page and `total` from the API response. Update URL `?page=N` on page change.
- [ ] 5.4 Implement loading state with skeleton card grid using shadcn `Skeleton` components matching the artist card dimensions.
- [ ] 5.5 Implement empty state: when no artists match, show contextual message. If search query is active, include a "Clear search" action. Use existing `PageStates` pattern or a local empty state component.
- [ ] 5.6 Implement error state with retry action using existing error state pattern.
- [ ] 5.7 Add SEO meta tags via `SeoHead` / `react-helmet-async`: set `<title>` to "Artists | Ticketbox".

## 6. Follow/Favorite Controls Component

- [ ] 6.1 Create `src/features/artists/components/FollowFavoriteControls.tsx` — renders follow and favorite toggle buttons. Props: `artistId`, `slug`, `viewerFollowing`, `viewerFavorited`, `followerCount`, `favoriteCount`. Uses `useFollowArtist` and `useFavoriteArtist` mutation hooks.
- [ ] 6.2 Implement auth gating: check `useAuth()` context. If no session, click handler navigates to `/login?returnTo=/artists/:slug` instead of firing mutation. Use `useNavigate` from React Router.
- [ ] 6.3 Implement optimistic UI toggle: on click, immediately toggle button appearance (filled/outlined icon, count ±1). Disable button while mutation `isPending` to prevent double-click.
- [ ] 6.4 Implement error rollback: on mutation error, revert button state and show error toast/notification using Ant Design `message` or existing notification pattern.
- [ ] 6.5 Style follow button (outline/filled states with lucide-react `UserPlus`/`UserCheck` icons) and favorite button (outline/filled heart with lucide-react `Heart`/`HeartOff` icons). Use shadcn `Button` variants.

## 7. Artist Profile Page

- [ ] 7.1 Create `src/features/artists/ArtistProfilePage.tsx` reading `:slug` from route params via `useParams`. Call `useArtistProfile(slug)`. Handle loading, error, and not-found states.
- [ ] 7.2 Create `src/features/artists/components/ArtistProfileHero.tsx` — hero section with poster/cover image as full-width background (gradient overlay for readability), circular avatar overlapping banner bottom, display name, bio text, follower count, favorite count. Fallback gradient when no poster. Fallback initials/icon when no avatar.
- [ ] 7.3 Integrate `FollowFavoriteControls` into the hero section, positioned next to or below the engagement counts.
- [ ] 7.4 Create `src/features/artists/components/ArtistTimeline.tsx` — renders upcoming events from `upcomingEvents` array as a responsive card grid. Each card shows poster, title, venue, city, date, event type badge, and links to `/events/:slug`.
- [ ] 7.5 Create `src/features/artists/components/TimelineEventCard.tsx` — a lightweight event card for the artist timeline. Renders `PublicArtistTimelineEvent` fields (title, venueName, city, startsAt, eventType, posterAsset). Links to `/events/:slug`. Uses shadcn `Card` and Tailwind layout.
- [ ] 7.6 Implement timeline empty state: when `upcomingEvents` is empty, show message. If `pastEventCount > 0`, include "N past events" context text.
- [ ] 7.7 Implement artist profile not-found state: when API returns 404, display not-found page with link back to `/artists`.
- [ ] 7.8 Implement artist profile loading state: skeleton placeholders for hero banner, avatar, name, bio, counts, and timeline cards.
- [ ] 7.9 Implement artist profile error state (non-404): error message with retry action.
- [ ] 7.10 Add SEO meta tags via `SeoHead` / `react-helmet-async`: set `<title>` to "{displayName} | Ticketbox", `og:title` to displayName, `og:description` to first 160 chars of bio (if present), `og:image` to avatar or poster publicUrl.
- [ ] 7.11 Implement responsive layout: mobile (< 768px) — hero stacks vertically with reduced height, timeline in single column. Desktop (>= 1024px) — full-width hero, timeline in multi-column grid.

## 8. Homepage Top Artists Rail

- [ ] 8.1 Create `src/features/artists/components/TopArtistsRail.tsx` — horizontal scrollable rail of `ArtistCard` (compact variant) components. Uses `useTopArtists()` hook. Supports scroll snap, left/right navigation arrows on desktop, swipe on mobile.
- [ ] 8.2 Implement rail loading state: skeleton card placeholders matching compact card dimensions in a horizontal row.
- [ ] 8.3 Implement rail empty/error handling: if API returns empty array or fails, hide the entire rail section (do not render an empty container or error message on the homepage).
- [ ] 8.4 Import and render `TopArtistsRail` in `src/features/concerts/HomePage.tsx` (or equivalent homepage component). Position after the featured events section. Add a "Top Artists" section heading with optional "View all" link to `/artists`.

## 9. Routing

- [ ] 9.1 Add `/artists` route to `src/app/router.tsx` rendering `ArtistListPage` inside `PublicLayout`. Use `React.lazy` for lazy loading with `SuspenseWrapper`.
- [ ] 9.2 Add `/artists/:slug` route to `src/app/router.tsx` rendering `ArtistProfilePage` inside `PublicLayout`. Use `React.lazy` for lazy loading with `SuspenseWrapper`.
- [ ] 9.3 Verify both routes are public (no auth guard wrapper) and render inside the existing `PublicLayout` shell with consistent header/footer.

## 10. Navigation Integration

- [ ] 10.1 Add "Artists" link to the audience app navigation bar/header (in `PublicLayout` or its nav component) linking to `/artists`. Position alongside existing "Events" link.

## 11. Testing

- [ ] 11.1 Write unit tests for `useArtists` hook: verify query key structure, param passing, and response typing.
- [ ] 11.2 Write unit tests for `useArtistProfile` hook: verify slug-based query key, enabled condition, and response typing.
- [ ] 11.3 Write unit tests for `useArtistActions` hooks: verify optimistic update in `onMutate`, rollback in `onError`, and invalidation in `onSettled` for both follow and favorite mutations.
- [ ] 11.4 Write component tests for `ArtistCard`: verify avatar rendering (with and without asset), name display, favorite count, link to profile route.
- [ ] 11.5 Write component tests for `FollowFavoriteControls`: verify auth gating (redirects to login when unauthenticated), optimistic toggle, disabled state during pending mutation.
- [ ] 11.6 Write component tests for `ArtistListPage`: verify search input debounce, pagination controls, loading/empty/error states.
- [ ] 11.7 Write component tests for `ArtistProfilePage`: verify hero rendering, timeline rendering, not-found state on 404, follow/favorite integration.
- [ ] 11.8 Write component tests for `TopArtistsRail`: verify rail renders artist cards, hides when empty or on error.
- [ ] 11.9 Write routing tests: verify `/artists` and `/artists/:slug` routes render correct pages, are public (no auth redirect), and lazy-load correctly.

## 12. Build Verification

- [ ] 12.1 Run `npm run typecheck -w @ticketbox/audience-web` (or equivalent) and verify no type errors in the audience web app.
- [ ] 12.2 Run `npm run test -w @ticketbox/audience-web` (or equivalent) and verify all tests pass.
- [ ] 12.3 Run the audience web dev server and manually verify: artist list page loads with search and pagination, artist profile page renders with hero/timeline/controls, follow/favorite toggles work for authenticated AUDIENCE user, login redirect works for anonymous user, homepage top artists rail renders, navigation link to artists works, mobile responsive layout is correct.
- [ ] 12.4 Verify that existing concert, checkout, account, and organizer/admin app behavior is unchanged — no regressions in other features.
