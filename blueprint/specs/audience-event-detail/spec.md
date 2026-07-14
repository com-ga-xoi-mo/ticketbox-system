# audience-event-detail Specification

## Purpose

TBD - created by syncing change implement-audience-discovery. Update Purpose after archive.

## Requirements

### Requirement: Published artist bio display
The event detail page SHALL display the published artist bio when available in the concert detail response.

#### Scenario: Artist bio is present
- **WHEN** the concert detail response includes a non-null `publishedArtistBio`
- **THEN** the detail page renders the artist bio in a dedicated section below the event description
- **AND** the bio text supports multi-paragraph rendering with proper line breaks

#### Scenario: Artist bio is absent
- **WHEN** the concert detail response has `publishedArtistBio` as null
- **THEN** the artist bio section is not rendered
- **AND** the page layout does not leave an empty gap

### Requirement: Interactive seating-zone map with ticket-type-centric availability
The event detail page SHALL render the venue seating-map SVG as an interactive, zone-level map. Because ticket inventory is tracked per ticket type and not per zone, availability SHALL always be expressed per ticket type, never as a single number attributed to a zone.

#### Scenario: Concert has a loadable seating map and seating zones
- **WHEN** the concert detail includes a non-null `seatingMapAsset` (resolvable via `publicUrl` or `GET /assets/:id`) and `seatingZones` with at least one zone
- **THEN** the detail page renders the seating-map SVG inline with each mapped zone clickable and keyboard-focusable
- **AND** clicking or activating (Enter/Space) a zone reveals the ticket types that apply to it, each showing its name, price, sale status, and remaining quantity
- **AND** a zone with no ticket type mapped to it is still rendered and labeled "Chưa có loại vé áp dụng"

#### Scenario: Viewing a ticket type's zones from the ticket type list
- **WHEN** a user clicks "Xem vị trí" on a ticket type card
- **THEN** every seating zone mapped to that ticket type is highlighted on the map
- **AND** on viewports narrower than 1024px the map scrolls into view
- **AND** this remains available even when the ticket type is sold out; only its quantity selector stays disabled

#### Scenario: Seating map SVG fails to load or parse
- **WHEN** the seating map asset is present but its SVG content cannot be fetched or is not valid SVG markup
- **THEN** the detail page falls back to rendering the seating map as a static image
- **AND** falls back to a plain zone list showing each zone's label, color, and the names of ticket types that apply to it, never a summed per-zone ticket count

#### Scenario: Concert has no seating map or no seating zones
- **WHEN** `seatingMapAsset` is null, or `seatingZones` is an empty array
- **THEN** no interactive map or zone list is rendered, matching the concert's existing non-seating-map presentation

#### Scenario: Zone-level display never shows a summed per-zone ticket count
- **WHEN** one or more ticket types are mapped to a zone
- **THEN** the zone's availability is always expressed per ticket type (e.g. "Vé VIP còn 20 vé — áp dụng cho VIP Left và VIP Right")
- **AND** never as a single summed number attributed to the zone (e.g. never "Khu vực VIP còn 20 ghế")

### Requirement: Seating map static-image fallback
The event detail page SHALL be able to display the seating map asset as a plain reference image whenever the interactive zone map (see "Interactive seating-zone map with ticket-type-centric availability") is not usable — i.e. no seating zones exist, or the SVG failed to load.

#### Scenario: Seating map asset is present but not usable as an interactive map
- **WHEN** the concert detail includes a non-null `seatingMapAsset` with a `publicUrl`, and either `seatingZones` is empty or the SVG failed to load
- **THEN** the detail page renders the seating map as a static `<img>`
- **AND** the image resolves via `publicUrl` first, falling back to `GET /assets/:id` if `publicUrl` is null

#### Scenario: Seating map asset is absent
- **WHEN** the concert detail has `seatingMapAsset` as null
- **THEN** no seating map section is rendered

### Requirement: Sale window state indicators
The event detail page SHALL display the sale state of each ticket type based on the current time relative to `saleStartsAt` and `saleEndsAt`.

#### Scenario: Sale has not started
- **WHEN** the current time is before a ticket type's `saleStartsAt`
- **THEN** the ticket type displays a "Sale starts on [date]" indicator
- **AND** the quantity selector is disabled for that ticket type

#### Scenario: Sale is active
- **WHEN** the current time is between `saleStartsAt` and `saleEndsAt` and `status` is `ACTIVE`
- **THEN** the ticket type displays an "On sale" indicator
- **AND** the quantity selector is enabled

#### Scenario: Sale has ended
- **WHEN** the current time is after a ticket type's `saleEndsAt`
- **THEN** the ticket type displays a "Sale ended" indicator
- **AND** the quantity selector is disabled

#### Scenario: Ticket type is paused
- **WHEN** a ticket type has `status` of `PAUSED`
- **THEN** the ticket type displays a "Temporarily unavailable" indicator
- **AND** the quantity selector is disabled

### Requirement: Sold-out handling
The event detail page SHALL handle sold-out states at both the ticket type level and the full concert level.

#### Scenario: Individual ticket type sold out
- **WHEN** a ticket type has `status` of `SOLD_OUT` or `availableQuantity` of 0
- **THEN** that ticket type displays a "Sold out" badge
- **AND** the quantity selector is disabled for that type

#### Scenario: All ticket types sold out
- **WHEN** every ticket type in the concert has `availableQuantity` of 0
- **THEN** the detail page displays a prominent "Sold out" banner
- **AND** the primary CTA button is disabled with "Sold out" text

### Requirement: Functional ticket quantity selector
The event detail page SHALL manage ticket quantity selection as local state with validation against availability and per-user limits. When the user confirms their selection, the page SHALL navigate to the checkout flow passing the selected ticket types and quantities, gated behind authentication.

#### Scenario: Incrementing ticket quantity
- **WHEN** a user clicks the "+" button on an active ticket type
- **THEN** the quantity for that ticket type increments by 1
- **AND** the displayed quantity updates immediately

#### Scenario: Quantity respects maximum per user
- **WHEN** the quantity for a ticket type reaches its `maxPerUser` value
- **THEN** the "+" button is disabled for that ticket type

#### Scenario: Quantity respects available stock
- **WHEN** the quantity for a ticket type reaches its `availableQuantity`
- **THEN** the "+" button is disabled for that ticket type

#### Scenario: Decrementing ticket quantity
- **WHEN** a user clicks the "-" button on a ticket type with quantity > 0
- **THEN** the quantity decrements by 1

#### Scenario: Quantity cannot go below zero
- **WHEN** a ticket type has quantity of 0
- **THEN** the "-" button is disabled for that ticket type

#### Scenario: Checkout button navigates to checkout flow
- **WHEN** the user clicks "Tiếp tục mua vé" with at least one ticket type having quantity > 0
- **THEN** the page SHALL navigate to the checkout page passing the concert ID and selected ticket type quantities as state
- **AND** if the user is not authenticated, the page SHALL redirect to `/login?returnTo=/events/:slug` instead

#### Scenario: Checkout button is disabled without selection
- **WHEN** no ticket types have quantity > 0
- **THEN** the "Tiếp tục mua vé" button SHALL be disabled

### Requirement: Concert not found handling
The event detail page SHALL handle the case where a concert slug does not resolve to a published upcoming concert.

#### Scenario: Concert not found from API
- **WHEN** the `GET /concerts/:slug` endpoint returns 404
- **THEN** the detail page renders a not-found state with a link back to the event listing

#### Scenario: Concert was published but is now past
- **WHEN** the concert existed but `startsAt` is in the past
- **THEN** the backend returns 404 and the frontend renders the not-found state

### Requirement: Responsive event detail layout
The event detail page SHALL adapt its layout across viewport sizes with poster and content side by side on desktop and stacked on mobile.

#### Scenario: Mobile stacked layout
- **WHEN** the event detail is viewed on mobile (< 1024px)
- **THEN** the poster displays above the event info content in a single-column stack

#### Scenario: Desktop side-by-side layout
- **WHEN** the event detail is viewed on desktop (>= 1024px)
- **THEN** the poster is sticky on the left and event info scrolls on the right

### Requirement: SEO meta tags on event detail page
The event detail page SHALL render Open Graph and Twitter Card meta tags using `react-helmet-async`, sourcing values from the concert detail response's SEO fields with fallbacks to standard event data.

#### Scenario: Meta tags render from SEO fields when present
- **WHEN** the event detail page loads a concert with non-null `seoTitle`, `seoDescription`, and `seoImageUrl`
- **THEN** the `<Helmet>` component sets `<title>` to `seoTitle`
- **AND** sets `og:title` to `seoTitle`
- **AND** sets `og:description` to `seoDescription`
- **AND** sets `og:image` to `seoImageUrl`
- **AND** sets corresponding `twitter:title`, `twitter:description`, `twitter:image` tags

#### Scenario: Meta tags fall back when SEO fields are null
- **WHEN** the event detail page loads a concert with null SEO fields
- **THEN** `<title>` is set to `"{title} | Ticketbox"`
- **AND** `og:title` falls back to the concert `title`
- **AND** `og:description` falls back to the first 160 characters of `description`
- **AND** `og:image` falls back to `posterAsset.publicUrl`

#### Scenario: Event type badge on detail page
- **WHEN** the event detail page renders a concert with `eventType` of `WORKSHOP`
- **THEN** a badge displaying "Workshop" is shown near the event title

#### Scenario: Meta tags set og:type to event
- **WHEN** the event detail page renders
- **THEN** `og:type` is set to `"event"`

### Requirement: Audience map uses persisted concert coordinates
The audience event detail page SHALL display an OpenStreetMap-backed Leaflet map with a marker at the concert's persisted `latitude` and `longitude` when both fields are non-null in the public concert detail response. When either coordinate is null, the map SHALL NOT be rendered and no fallback coordinate SHALL be assumed.

#### Scenario: Concert has persisted coordinates — map is shown
- **WHEN** the public concert detail response includes non-null `latitude` and `longitude`
- **THEN** the event detail page SHALL render the Leaflet map with a marker at those coordinates
- **AND** the OpenStreetMap tile attribution SHALL be visible

#### Scenario: Concert has no coordinates — map is hidden
- **WHEN** the public concert detail response has `latitude: null` or `longitude: null`
- **THEN** the event detail page SHALL NOT render a map
- **AND** `venueName`, `venueAddress`, and `city` SHALL still be displayed

#### Scenario: Map button is hidden when coordinates are absent
- **WHEN** the public concert detail response has no coordinates
- **THEN** any "View on map" or "Xem bản đồ" button or link SHALL be hidden or disabled
- **AND** no modal containing an empty or incorrectly positioned map SHALL be shown

#### Scenario: No HCMC fallback is used
- **WHEN** the concert has no saved coordinates
- **THEN** the system SHALL NOT display a map centered on Ho Chi Minh City or any other default location

#### Scenario: Hard-coded venue-coordinates lookup is removed
- **WHEN** the audience event detail page renders for any concert
- **THEN** coordinate resolution SHALL come only from the API response `latitude` and `longitude` fields
- **AND** no venue name matching or hard-coded coordinate table SHALL be used

#### Scenario: OSM attribution remains visible on the map
- **WHEN** the map is rendered for a concert with coordinates
- **THEN** the OpenStreetMap attribution text SHALL be visible and unobstructed per OSM tile usage policy

#### Scenario: Audience map uses the canonical OSM tile endpoint
- **WHEN** the audience map requests raster tiles
- **THEN** it SHALL use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **AND** the app SHALL preserve normal browser Referer and cache behavior
- **AND** it SHALL NOT prefetch or provide offline tile downloads

### Requirement: Event detail displays concert reviews
The audience event detail page SHALL display visible concert reviews and aggregate rating information for the current concert.

#### Scenario: Concert has visible reviews
- **WHEN** a user views a concert detail page with visible reviews
- **THEN** the page displays the average rating, review count, and visible review comments

#### Scenario: Concert has no visible reviews
- **WHEN** a user views a concert detail page with no visible reviews
- **THEN** the page displays an empty-state message instead of failing

#### Scenario: Hidden reviews are not displayed
- **WHEN** an admin has hidden a review
- **THEN** the audience event detail page does not display that review
- **AND** the hidden review is excluded from the displayed average rating and review count

### Requirement: Eligible audience can manage own concert review
The audience event detail page SHALL allow an authenticated audience user with an issued ticket for the concert to create, edit, or delete their own review.

#### Scenario: Eligible user sees review form
- **GIVEN** an authenticated user has at least one issued ticket for the concert
- **WHEN** the user views the concert detail page
- **THEN** the page displays a review form

#### Scenario: Ineligible user does not see review form
- **GIVEN** a user is unauthenticated or has no issued ticket for the concert
- **WHEN** the user views the concert detail page
- **THEN** the page does not display a review submission form

#### Scenario: Existing reviewer can edit review
- **GIVEN** an authenticated user already has a review for the concert
- **WHEN** the user updates their rating or comment
- **THEN** the page sends the update request and refreshes the displayed review state

#### Scenario: Existing reviewer can delete review
- **GIVEN** an authenticated user already has a review for the concert
- **WHEN** the user deletes their review
- **THEN** the page removes the user's review from the visible review state

#### Scenario: Review mutation refreshes public summary
- **WHEN** a user creates, updates, or deletes their review
- **THEN** the page refreshes the review summary so average rating and review count reflect the latest visible reviews
