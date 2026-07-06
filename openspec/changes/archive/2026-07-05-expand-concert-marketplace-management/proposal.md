## Why

Audience marketplace responses already expose event categories, featured ordering, banner/SEO metadata, and linked artists, but the protected admin/organizer APIs and management UI cannot consistently read or maintain that data. This leaves seeded marketplace content visible to audiences while operators remain limited to the older single `artistName` and basic concert fields.

## What Changes

- Add canonical shared management contracts for protected concert and artist requests/responses, including event type, safe poster/banner metadata, linked artists, SEO fields, and admin moderation fields.
- Extend organizer-owned concert create/update flows with event type and SEO management while preserving `CONCERT` as the compatibility default for omitted event type.
- Extend organizer create/update and admin update contracts with marketplace content; admin update alone may mutate moderation through `isFeatured` and `displayOrder`. Concert creation remains organizer-only.
- Make protected concert list/detail reads include linked artists, including inactive linked artists for management visibility, and safe asset metadata without storage internals.
- Harden the existing replace-style concert-artist endpoints with validated ordering, atomic primary-artist synchronization to legacy `Concert.artistName`, ownership checks, and active-artist eligibility rules.
- Define `DRAFT` and `PUBLISHED` as the only marketplace-editable statuses and serialize concurrent artist replacements so the last committed complete replacement wins.
- Add banner upload/replacement for organizer-owned and admin-managed concerts using the existing object-storage lifecycle and `bannerAssetId` relation.
- Add a protected admin artist catalog API and `/admin/artists` UI for search, pagination, create/edit, status management, and avatar/poster uploads.
- Add event-type, multi-artist ordering, banner, and SEO controls to organizer/admin concert management; add admin-only featured controls.
- Preserve public audience behavior, legacy fields, publish/cancel workflow, and existing database tables/columns.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `concert-management`: Extend protected concert reads/writes, artist replacement semantics, primary artist compatibility, banner lifecycle, SEO validation, and admin-only featured moderation.
- `web-concert-management`: Add marketplace metadata, ordered artist selection, banner/SEO management, and role-specific moderation controls to admin/organizer concert screens.
- `artist-discovery`: Add validated protected artist administration/search contracts and define active/inactive behavior for concert selection and existing links.
- `shared-api-contracts`: Make management concert and artist Zod contracts canonical across backend HTTP adapters and the web client.
- `cloud-object-storage`: Apply the existing durable upload, public URL, replacement, and cleanup guarantees to concert banner assets.

## Impact

- **Shared contracts:** `packages/api-types` gains management concert, artist catalog, artist-link, banner, and moderation schemas/types.
- **Backend:** concert-management and artist-discovery controllers, DTOs, use cases, repositories, transactions, and object-storage integration change; no new database table or column is required.
- **Web:** `apps/web` gains `/admin/artists`, artist catalog management, async artist selection/order controls, event type, banner/SEO, and admin featured controls.
- **Compatibility:** `posterAssetId`, `bannerAssetId`, and `artistName` remain; omitted event type remains `CONCERT`; linked primary artists own the legacy name projection while unlinked concerts keep manual `artistName`; no automatic artist creation or historical name-based backfill occurs.
- **Authorization:** organizers manage marketplace content only for owned concerts; only admins manage the artist catalog and featured placement.
