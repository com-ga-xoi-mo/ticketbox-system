## ADDED Requirements

### Requirement: Verified buyers can create one concert review
The system SHALL allow an authenticated audience user to create one review for a concert only when the user owns at least one `ISSUED` ticket for that concert. Each review SHALL include a rating from 1 to 5 and a bounded text comment.

#### Scenario: User with issued ticket creates review
- **WHEN** an authenticated user with at least one `ISSUED` ticket for a concert submits `POST /concerts/:slug/reviews` with a valid rating and comment
- **THEN** the system SHALL create a `VISIBLE` review linked to that concert and user

#### Scenario: User without issued ticket is rejected
- **WHEN** an authenticated user without an `ISSUED` ticket for the concert submits `POST /concerts/:slug/reviews`
- **THEN** the system SHALL reject the request without creating a review

#### Scenario: Unauthenticated user is rejected
- **WHEN** an unauthenticated user submits `POST /concerts/:slug/reviews`
- **THEN** the system SHALL reject the request with an authentication error

#### Scenario: Duplicate review is rejected
- **WHEN** a user who already reviewed a concert submits another `POST /concerts/:slug/reviews` for the same concert
- **THEN** the system SHALL reject the request and SHALL NOT create a second review

#### Scenario: Concurrent duplicate review is rejected
- **WHEN** duplicate create requests for the same user and concert arrive concurrently
- **THEN** the system SHALL persist at most one review because `(concertId, userId)` is unique

### Requirement: Review input is validated
The system SHALL validate review input before persistence.

#### Scenario: Rating below allowed range is rejected
- **WHEN** a user submits a rating lower than 1
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Rating above allowed range is rejected
- **WHEN** a user submits a rating greater than 5
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Empty comment is rejected
- **WHEN** a user submits an empty or whitespace-only comment
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Overlong comment is rejected
- **WHEN** a user submits a comment longer than the configured maximum length
- **THEN** the system SHALL reject the request with a validation error

### Requirement: Review owner can update or delete their review
The system SHALL allow a user to update or delete only their own review for a concert.

#### Scenario: Owner updates own review
- **WHEN** an authenticated user who owns a review submits `PATCH /concerts/:slug/reviews/me` with valid rating or comment changes
- **THEN** the system SHALL update that user's review for the concert

#### Scenario: Owner deletes own review
- **WHEN** an authenticated user who owns a review submits `DELETE /concerts/:slug/reviews/me`
- **THEN** the system SHALL delete or remove that user's public review for the concert

#### Scenario: User cannot update another user's review
- **WHEN** a user attempts to update a review they do not own
- **THEN** the system SHALL reject the request and SHALL NOT modify the other user's review

#### Scenario: User cannot delete another user's review
- **WHEN** a user attempts to delete a review they do not own
- **THEN** the system SHALL reject the request and SHALL NOT remove the other user's review

### Requirement: Public review list and aggregate exclude hidden reviews
The system SHALL expose public concert review data through `GET /concerts/:slug/reviews`. Public responses SHALL include only `VISIBLE` reviews. Average rating and review count SHALL be calculated only from `VISIBLE` reviews.

#### Scenario: Public review list includes visible reviews
- **WHEN** a user requests `GET /concerts/:slug/reviews`
- **THEN** the system SHALL return the concert's `VISIBLE` reviews with author display information, rating, comment, and timestamp

#### Scenario: Hidden reviews are excluded from public list
- **WHEN** a review has status `HIDDEN`
- **THEN** `GET /concerts/:slug/reviews` SHALL NOT return that review

#### Scenario: Average rating counts visible reviews only
- **WHEN** a concert has both `VISIBLE` and `HIDDEN` reviews
- **THEN** the average rating and review count SHALL be calculated using only `VISIBLE` reviews

#### Scenario: Concert with no visible reviews returns empty aggregate
- **WHEN** a concert has no `VISIBLE` reviews
- **THEN** the system SHALL return an empty review list, review count 0, and no misleading positive average rating

### Requirement: Admin can hide violating reviews
The system SHALL allow only `ADMIN` users to hide concert reviews. Hiding a review SHALL set its status to `HIDDEN`, record `hiddenAt`, `hiddenByUserId`, and `hiddenReason`, and remove it from public review responses.

#### Scenario: Admin hides review
- **WHEN** an authenticated `ADMIN` submits `PATCH /admin/concerts/:concertId/reviews/:reviewId/hide` with a reason
- **THEN** the system SHALL mark the review as `HIDDEN` and record the moderation metadata

#### Scenario: Organizer cannot hide review
- **WHEN** an authenticated `ORGANIZER` submits the admin hide endpoint
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Audience cannot hide review
- **WHEN** an authenticated audience user submits the admin hide endpoint
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Hidden review no longer appears publicly
- **WHEN** an admin hides a review
- **THEN** subsequent public review list and aggregate responses SHALL exclude that review

#### Scenario: Hiding already hidden review is safe
- **WHEN** an admin hides a review that is already `HIDDEN`
- **THEN** the system SHALL keep the review hidden and return a controlled response without making it public
