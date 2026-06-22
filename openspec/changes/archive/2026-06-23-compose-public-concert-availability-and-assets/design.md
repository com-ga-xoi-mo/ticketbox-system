## Context

The public audience catalog currently exposes `GET /concerts`, `GET /concerts/:slug`, and
`GET /concerts/:slug/availability`. The catalog cache already separates longer-lived list/detail
entries from shorter-lived availability snapshots, but the detail payload still includes
`ticketTypes[].availableQuantity`. If that field is cached inside the static detail payload, users
can see stale ticket availability for the full static TTL. The list payload can keep
`availabilitySummary` for response-shape compatibility and coarse display hints, but the list page
does not need near-real-time ticket availability.

Asset uploads already create `publicUrl` through `ObjectStoragePort.getPublicUrl(storageKey)` and
persist it on the `Asset` row. In production, the intended path is CDN/object-storage delivery via
that `publicUrl`; backend streaming through `GET /assets/:id` remains useful as fallback and for
debug/development.

## Goals / Non-Goals

**Goals:**

- Preserve the current public API response shapes for concert list and detail.
- Keep `GET /concerts` as a static cached list response, including `availabilitySummary`, without
  requiring near-real-time freshness for that summary.
- Compose short-TTL availability data into concert detail responses at read time.
- Keep public visibility rules strict: only upcoming `PUBLISHED` concerts are exposed.
- Make the production asset contract explicit: clients render `asset.publicUrl` directly when it is
  present.
- Keep backend asset streaming available as fallback without making it the primary production path.

**Non-Goals:**

- Add a new endpoint for image URLs.
- Add image resizing, variants, or transformation URLs.
- Change the database schema.
- Add local `/storage` static serving behavior.
- Change organizer/admin concert APIs except where shared mappers or tests need to keep contracts
  consistent.

## Decisions

1. Compose detail availability in the backend, not the audience frontend.

   Public detail endpoints will continue returning the fields the audience frontend needs. The
   backend reads static detail data from the longer TTL cache, reads availability from the short TTL
   cache, and overlays `ticketTypes[].availableQuantity` before returning the response. This avoids
   forcing the concert detail page to coordinate multiple API calls just to get current ticket
   counts.

   Alternative considered: remove availability-derived fields from detail and require the frontend
   to call `GET /concerts/:slug/availability`. That would make cache ownership simpler but would be
   a larger public API behavior change and would complicate the first detail page load.

2. Keep list availability summary as static/coarse data.

   `GET /concerts` keeps returning `availabilitySummary` to preserve the existing response shape,
   but this change does not require that field to be refreshed through the short-TTL availability
   cache. The audience list page is primarily for browsing concert cards; fresh ticket counts belong
   on detail and the dedicated availability endpoint.

   Alternative considered: compose short-TTL availability summaries into the list response. That
   gives fresher list badges but adds extra cache reads for every listed concert and is unnecessary
   for the current audience flow.

3. Treat static detail data and availability data as separate cache values.

   Static concert list/detail data keeps the longer TTL because title, venue, schedule, assets, zones,
   and ticket type metadata change through organizer/admin writes and can be invalidated by prefix.
   Detail availability keeps the shorter TTL because it changes through reservation/payment activity
   and must refresh without invalidating the entire static detail payload.

   Alternative considered: cache fully composed responses only. That preserves implementation
   simplicity but keeps detail availability stale for the static TTL or forces public detail caches
   down to the short TTL.

4. Merge detail availability by stable identifiers.

   Detail composition will match availability rows to `ticketTypes[]` by ticket type id, not by array
   position or code. Missing availability data will not fail the request; the static value is
   preserved as a safe fallback.

   Alternative considered: replace whole `ticketTypes[]` objects from the availability response. That
   risks dropping static metadata fields and makes partial availability failures more brittle.

5. Keep `publicUrl` as the production image/SVG path.

   Upload use-cases should continue storing `publicUrl` from `storage.getPublicUrl(storageKey)`.
   Public catalog responses expose asset metadata with `id` and `publicUrl`. Audience clients render
   `publicUrl` directly, letting Cloudflare/S3/CDN handle caching and delivery. `GET /assets/:id`
   remains a backend-streaming fallback path when a client cannot use the public URL.

   Alternative considered: make all audience images go through `GET /assets/:id`. That is useful for
   local fallback but adds backend load and bypasses the CDN/object storage path intended for
   production traffic.

## Risks / Trade-offs

- Detail availability and static data can briefly disagree if a ticket type is edited while
  availability is cached. Mitigation: admin/organizer writes continue invalidating static catalog
  keys, and availability uses a short TTL.
- List `availabilitySummary` can be stale for the static list TTL. Mitigation: the audience list
  treats this field as coarse summary data; fresh ticket availability is provided by detail and the
  dedicated availability endpoint.
- If `publicUrl` is misconfigured in production, images fail even though asset metadata exists.
  Mitigation: keep `GET /assets/:id` as fallback/debug path and cover `S3_PUBLIC_BASE_URL` URL
  construction with tests.
- Browser performance still depends on image size. Mitigation: this change keeps binary files out of
  JSON responses and leaves later image variants/resizing as a separate enhancement.

## Migration Plan

- Implement detail composition behind the existing public API route without changing route names or
  response shapes.
- Add tests around cache composition and public visibility before changing production behavior.
- Deploy with existing storage configuration; production environments using `STORAGE_DRIVER=s3` must
  keep `S3_PUBLIC_BASE_URL` pointed at the CDN/object-storage public domain.
- Rollback is reverting the composition layer to the previous cached list/detail behavior; no data
  migration is required.

## Open Questions

- None for this change. Image variants and responsive poster URLs are intentionally deferred.
