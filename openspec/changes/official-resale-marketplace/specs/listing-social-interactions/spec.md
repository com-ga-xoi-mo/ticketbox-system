## ADDED Requirements

### Requirement: Authenticated users can upvote a resale listing
The system SHALL allow any authenticated user to upvote an `ACTIVE` resale listing via `POST /resale/listings/:id/upvote`. Upvoting the same listing a second time SHALL remove the upvote (toggle). Each user SHALL have at most one upvote per listing at any time. The upvote count SHALL be visible to all users (authenticated and anonymous) on the listing card and detail page.

#### Scenario: User upvotes a listing
- **WHEN** an authenticated user sends `POST /resale/listings/:id/upvote` for a listing they have not yet upvoted
- **THEN** the system SHALL create a `ListingUpvote` record, increment the listing's `upvoteCount`, and return the new count with `upvoted: true`

#### Scenario: User removes their upvote (toggle)
- **WHEN** an authenticated user sends `POST /resale/listings/:id/upvote` for a listing they have already upvoted
- **THEN** the system SHALL delete the `ListingUpvote` record, decrement the listing's `upvoteCount`, and return the new count with `upvoted: false`

#### Scenario: Unauthenticated user cannot upvote
- **WHEN** an unauthenticated user attempts to upvote a listing
- **THEN** the system SHALL reject the request with a 401 Unauthorized error

#### Scenario: Seller cannot upvote their own listing
- **WHEN** the listing owner attempts to upvote their own listing
- **THEN** the system SHALL reject the request with an error indicating self-upvoting is not permitted

#### Scenario: Upvote count is visible to all
- **WHEN** any user (authenticated or anonymous) views a listing card or detail page
- **THEN** the system SHALL include the current `upvoteCount` in the response

#### Scenario: Upvote on non-ACTIVE listing is rejected
- **WHEN** a user attempts to upvote a `SOLD`, `CANCELLED`, or `EXPIRED` listing
- **THEN** the system SHALL reject the request indicating the listing is no longer active

### Requirement: Listing feed is ranked by engagement
The system SHALL rank listings in the community feed using a score combining recency and upvote count. Listings with more upvotes SHALL appear higher in the default feed sort. The feed SHALL support explicit sort modes: `trending` (default, engagement-weighted), `newest`, and `price_asc` / `price_desc`.

#### Scenario: Default feed sorted by trending
- **WHEN** a user requests `GET /resale/listings?concertId=<id>` without a sort parameter
- **THEN** the system SHALL return listings ordered by a trending score (upvote count weighted by recency)

#### Scenario: User sorts by newest
- **WHEN** a user requests `GET /resale/listings?concertId=<id>&sort=newest`
- **THEN** the system SHALL return listings ordered by `createdAt` descending

#### Scenario: User sorts by price
- **WHEN** a user requests `GET /resale/listings?concertId=<id>&sort=price_asc`
- **THEN** the system SHALL return listings ordered from lowest to highest asking price

### Requirement: Public threaded comments on listings
The system SHALL allow authenticated users to post public comments on `ACTIVE` resale listings via `POST /resale/listings/:id/comments`. Comments SHALL be visible to all users (authenticated and anonymous). Each comment may receive replies via `POST /resale/listings/:id/comments/:commentId/replies`. The system SHALL return comments paginated, ordered by creation time ascending, with replies nested under their parent comment.

#### Scenario: User posts a comment on a listing
- **WHEN** an authenticated user submits a non-empty comment body to `POST /resale/listings/:id/comments`
- **THEN** the system SHALL create a `ListingComment` record linked to the listing and user, and return the comment with author display name and timestamp

#### Scenario: User replies to a comment
- **WHEN** an authenticated user submits a reply to an existing comment via `POST /resale/listings/:id/comments/:commentId/replies`
- **THEN** the system SHALL create a `ListingCommentReply` linked to the parent comment and return the reply with author display name and timestamp

#### Scenario: Comments are visible to unauthenticated users
- **WHEN** an unauthenticated user views a listing detail page
- **THEN** the system SHALL include the comment thread in the response; no auth required to read comments

#### Scenario: Comment on non-ACTIVE listing is rejected
- **WHEN** a user attempts to comment on a `SOLD`, `CANCELLED`, or `EXPIRED` listing
- **THEN** the system SHALL reject the request indicating the listing is no longer open for discussion

#### Scenario: Empty comment body is rejected
- **WHEN** a user submits a comment with an empty or whitespace-only body
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Seller is notified of new comments
- **WHEN** a new comment or reply is posted on a seller's listing
- **THEN** the system SHALL enqueue a notification (email or push) to the seller via the existing BullMQ pipeline

### Requirement: Users can flag comments for moderation
The system SHALL allow authenticated users to flag a comment as inappropriate via `POST /resale/listings/:id/comments/:commentId/flag`. Flagged comments SHALL be hidden from public view once they exceed a flag threshold (3 flags) and queued for admin review.

#### Scenario: User flags a comment
- **WHEN** an authenticated user flags a comment they have not previously flagged
- **THEN** the system SHALL record the flag and, if the total flag count reaches 3, hide the comment from public view

#### Scenario: Comment hidden after threshold
- **WHEN** a comment's flag count reaches 3
- **THEN** the system SHALL set `isHidden: true` on the comment and it SHALL NOT appear in public comment listings

#### Scenario: User cannot flag the same comment twice
- **WHEN** a user attempts to flag a comment they have already flagged
- **THEN** the system SHALL reject the request without changing the flag count
