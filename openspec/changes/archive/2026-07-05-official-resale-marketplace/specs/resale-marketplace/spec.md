## ADDED Requirements

### Requirement: Community feed lists resale listings as social posts
The system SHALL expose a public community feed endpoint `GET /resale/listings` that returns `ACTIVE` resale listings presented as social posts. Each listing item in the feed SHALL include: asking price, original face value, ticket type, event name and date, seller display name, seller trust badge, upvote count, comment count, unread DM indicator (for authenticated users), and a "Verified by TicketBox" authenticity badge. The feed SHALL support filtering by `concertId` and sort modes: `trending` (default), `newest`, `price_asc`, `price_desc`.

#### Scenario: Browse community feed for a specific event
- **WHEN** a user (authenticated or anonymous) requests `GET /resale/listings?concertId=<id>`
- **THEN** the system SHALL return all `ACTIVE` listings for that concert as feed posts, sorted by trending score by default, excluding seller personal information beyond display name and trust tier

#### Scenario: Authenticated user sees their upvote state per listing
- **WHEN** an authenticated user fetches the feed
- **THEN** each listing item SHALL include `upvotedByMe: true/false` reflecting whether the user has upvoted that listing

#### Scenario: No active listings for event
- **WHEN** a user requests resale listings for an event with no active listings
- **THEN** the system SHALL return an empty feed with an appropriate empty state message

#### Scenario: Expired or sold listings excluded from feed
- **WHEN** a user browses the community feed
- **THEN** only `ACTIVE` listings SHALL appear; `SOLD`, `CANCELLED`, and `EXPIRED` listings SHALL NOT be shown

#### Scenario: Feed supports pagination
- **WHEN** a user requests the feed with `?page=2&limit=20`
- **THEN** the system SHALL return the appropriate page of results with `totalCount` and `hasMore` in the response

### Requirement: Resale listing detail shows community engagement
The system SHALL expose `GET /resale/listings/:id` returning full listing details including: ticket type, zone/seat info, original face value, asking price, event details, "Verified by TicketBox" badge, upvote count, the full comment thread (first page), seller display name, seller trust badge, and a link to the seller's public profile. Authenticated users also see a "Message Seller" button and their own upvote state.

#### Scenario: View listing detail with community data
- **WHEN** a user requests detail for an `ACTIVE` listing
- **THEN** the system SHALL return full listing info, upvote count, comment thread (first 20 comments), seller display name, seller trust tier, and verification badge

#### Scenario: Authenticated user sees engagement actions
- **WHEN** an authenticated user views a listing detail
- **THEN** the page SHALL show an active "Upvote" button (toggled if already upvoted), a "Comment" input, and a "Message Seller" button

#### Scenario: Unauthenticated user prompted to log in for actions
- **WHEN** an unauthenticated user views a listing detail and clicks "Upvote", "Comment", or "Message Seller"
- **THEN** the system SHALL redirect to the login page with a return URL to the listing

#### Scenario: View detail of non-active listing
- **WHEN** a user requests detail for a `SOLD`, `CANCELLED`, or `EXPIRED` listing
- **THEN** the system SHALL return a not-found response or a message indicating the listing is no longer available

### Requirement: Buyer can purchase a resale listing
The system SHALL allow an authenticated AUDIENCE user to purchase an active resale listing via `POST /resale/purchase`. The purchase flow SHALL atomically: validate the listing is `ACTIVE`, lock the listing row, process payment for the asking price, execute the ticket transfer, record the `ResaleTransaction`, and transition the listing to `SOLD`. Upon sale, all `ACTIVE` DM threads on the listing SHALL be marked as closed.

#### Scenario: Successful resale purchase
- **WHEN** an authenticated buyer submits a purchase request for an `ACTIVE` listing with valid payment
- **THEN** the system SHALL lock the listing, process payment, transfer the ticket to the buyer, create a `ResaleTransaction`, transition the listing to `SOLD`, and close all DM threads on that listing

#### Scenario: Purchase rejected for own listing
- **WHEN** a user attempts to purchase their own resale listing
- **THEN** the system SHALL reject the request

#### Scenario: Purchase rejected for already-sold listing
- **WHEN** a buyer attempts to purchase a listing that has already been sold
- **THEN** the system SHALL reject the request indicating the listing is no longer available

#### Scenario: Concurrent purchases on same listing
- **WHEN** two buyers simultaneously attempt to purchase the same active listing
- **THEN** the system SHALL use row-level locking to ensure only the first transaction succeeds; the second buyer SHALL receive a "listing no longer available" error

#### Scenario: Purchase rejected for expired listing
- **WHEN** a buyer attempts to purchase a listing that has auto-expired
- **THEN** the system SHALL reject the request indicating the listing has expired

### Requirement: Resale purchase pricing excludes promotions
The system SHALL NOT apply promotional codes or discounts to resale purchases. The buyer pays the exact asking price set by the seller.

#### Scenario: Promo code rejected on resale purchase
- **WHEN** a buyer attempts to apply a promo code during resale purchase
- **THEN** the system SHALL reject or ignore the promo code, charging the full asking price

### Requirement: Community marketplace page in audience web app
The system SHALL provide a community resale marketplace page at `/events/:slug/resale` in the audience web app. The page SHALL render listings as a social feed (similar to a Facebook group wall), with listing cards showing upvote button, comment count, DM button, seller trust badge, and buy action. The feed SHALL use infinite scroll with 20 items per page.

#### Scenario: Authenticated user views community marketplace
- **WHEN** an authenticated user navigates to `/events/:slug/resale`
- **THEN** the system SHALL display listings as a scrollable social feed with upvote, comment, DM, and buy actions per listing card

#### Scenario: Unauthenticated user views marketplace
- **WHEN** an unauthenticated user navigates to `/events/:slug/resale`
- **THEN** the listings and their engagement counts SHALL be visible; action buttons (Upvote, Comment, Message, Buy) SHALL redirect to login when clicked

#### Scenario: Event with resale disabled
- **WHEN** a user navigates to `/events/:slug/resale` for an event where resale is disabled
- **THEN** the system SHALL display a message indicating resale is not available for this event

#### Scenario: Infinite scroll loads next page
- **WHEN** a user scrolls to the bottom of the feed
- **THEN** the system SHALL fetch the next page of listings and append them to the feed without a full page reload
