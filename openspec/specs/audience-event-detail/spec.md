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

### Requirement: Seating zone display with availability
The event detail page SHALL display seating zones with their labels, colors, and per-zone availability derived from ticket type mappings.

#### Scenario: Concert has seating zones
- **WHEN** the concert detail includes `seatingZones` with at least one zone
- **THEN** the detail page renders a zone legend showing each zone's label and color indicator
- **AND** each zone shows the total available tickets for ticket types mapped to that zone

#### Scenario: Concert has no seating zones
- **WHEN** the concert detail includes an empty `seatingZones` array
- **THEN** the seating zones section is not rendered

### Requirement: Seating map image display
The event detail page SHALL display the seating map asset as a reference image when available.

#### Scenario: Seating map asset is present
- **WHEN** the concert detail includes a non-null `seatingMapAsset` with a `publicUrl`
- **THEN** the detail page renders the seating map image in a viewable format near the zone legend
- **AND** the image resolves via `publicUrl` first, falling back to `GET /assets/:id` if `publicUrl` is null

#### Scenario: Seating map asset is absent
- **WHEN** the concert detail has `seatingMapAsset` as null
- **THEN** no seating map image section is rendered

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
