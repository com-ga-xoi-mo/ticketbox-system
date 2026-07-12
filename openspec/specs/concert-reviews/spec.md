# concert-reviews Specification

## Purpose
Define how audiences review concerts after receiving issued tickets and how admins moderate reviews that should not remain public.

## Requirements

### Requirement: Verified buyers can create one concert review
The system SHALL allow an authenticated audience user to create at most one review per concert only when the user has at least one `ISSUED` ticket for that concert.

#### Scenario: User with issued ticket creates review
- **GIVEN** an authenticated user has at least one `ISSUED` ticket for a concert
- **WHEN** the user submits a rating and comment for that concert
- **THEN** the system creates a visible review linked to that user and concert

#### Scenario: User without issued ticket is rejected
- **GIVEN** an authenticated user has no `ISSUED` ticket for a concert
- **WHEN** the user submits a review for that concert
- **THEN** the system rejects the request

#### Scenario: Unauthenticated user is rejected
- **GIVEN** no authenticated audience user is present
- **WHEN** a review creation request is submitted
- **THEN** the system rejects the request

#### Scenario: Duplicate review is rejected
- **GIVEN** an authenticated user already has a review for a concert
- **WHEN** the user submits another create review request for the same concert
- **THEN** the system rejects the duplicate create request

#### Scenario: Concurrent duplicate review is rejected
- **GIVEN** an authenticated user has an issued ticket and no existing review for a concert
- **WHEN** multiple concurrent create requests for that user and concert are processed
- **THEN** at most one review is created

### Requirement: Review input is validated
The system SHALL validate review rating and comment fields before creating or updating a review.

#### Scenario: Rating below allowed range is rejected
- **WHEN** a user submits a rating below 1
- **THEN** the system rejects the request

#### Scenario: Rating above allowed range is rejected
- **WHEN** a user submits a rating above 5
- **THEN** the system rejects the request

#### Scenario: Empty comment is rejected
- **WHEN** a user submits an empty comment
- **THEN** the system rejects the request

#### Scenario: Overlong comment is rejected
- **WHEN** a user submits a comment longer than the configured maximum length
- **THEN** the system rejects the request

### Requirement: Review owner can update or delete their review
The system SHALL allow a user to update or delete only their own concert review.

#### Scenario: Owner updates own review
- **GIVEN** an authenticated user owns a review
- **WHEN** the user updates the review rating or comment
- **THEN** the system stores the updated review

#### Scenario: Owner deletes own review
- **GIVEN** an authenticated user owns a review
- **WHEN** the user deletes the review
- **THEN** the system removes the review from public results

#### Scenario: User cannot update another user's review
- **GIVEN** an authenticated user does not own a review
- **WHEN** the user tries to update that review
- **THEN** the system rejects the request

#### Scenario: User cannot delete another user's review
- **GIVEN** an authenticated user does not own a review
- **WHEN** the user tries to delete that review
- **THEN** the system rejects the request

### Requirement: Public review list and aggregate exclude hidden reviews
The system SHALL return only visible reviews in public review APIs and SHALL compute review aggregates from visible reviews only.

#### Scenario: Public review list includes visible reviews
- **WHEN** a user requests public reviews for a concert
- **THEN** the system returns reviews with `status = VISIBLE`

#### Scenario: Hidden reviews are excluded from public list
- **GIVEN** a review has `status = HIDDEN`
- **WHEN** a user requests public reviews for the concert
- **THEN** the hidden review is not returned

#### Scenario: Average rating counts visible reviews only
- **GIVEN** a concert has visible and hidden reviews
- **WHEN** the system computes average rating and review count
- **THEN** only visible reviews are included

#### Scenario: Concert with no visible reviews returns empty aggregate
- **GIVEN** a concert has no visible reviews
- **WHEN** the system computes review summary
- **THEN** it returns a zero review count and no misleading average rating

### Requirement: Admin can hide violating reviews
The system SHALL allow admins to hide reviews so they no longer appear publicly while preserving moderation metadata.

#### Scenario: Admin hides review
- **GIVEN** an authenticated admin user
- **WHEN** the admin hides a review with a reason
- **THEN** the review status becomes `HIDDEN`
- **AND** the system records `hiddenAt`, `hiddenByUserId`, and `hiddenReason`

#### Scenario: Organizer cannot hide review
- **GIVEN** an authenticated organizer user
- **WHEN** the organizer tries to hide a review
- **THEN** the system rejects the request

#### Scenario: Audience cannot hide review
- **GIVEN** an authenticated audience user
- **WHEN** the audience user tries to hide a review
- **THEN** the system rejects the request

#### Scenario: Hidden review no longer appears publicly
- **GIVEN** an admin has hidden a review
- **WHEN** public review data is requested for the concert
- **THEN** the hidden review is excluded

#### Scenario: Hiding already hidden review is safe
- **GIVEN** a review is already hidden
- **WHEN** an admin hides it again
- **THEN** the operation remains safe and does not create duplicate public review state
