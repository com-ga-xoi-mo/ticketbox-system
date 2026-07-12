## 1. Data Model And Contracts

- [x] 1.1 Add Prisma enum/model/migration for `concert_reviews`, including `VISIBLE`/`HIDDEN` status and unique `(concertId, userId)`.
- [x] 1.2 Add indexes needed for public listing, aggregate calculation, user-owned review lookup, and issued-ticket eligibility checks.
- [x] 1.3 Add or update shared API contracts/types for public review list, create/update/delete own review, and admin hide review.
- [x] 1.4 Regenerate Prisma client and rebuild `packages/api-types` if contract changes require it.

## 2. Backend Review Capability

- [x] 2.1 Create concert review domain errors and validation rules for rating range, comment length, duplicate review, missing issued ticket, and ownership violations.
- [x] 2.2 Implement repository/port methods for resolving concert by slug/id, checking issued-ticket eligibility, creating/updating/deleting own review, listing visible reviews, calculating visible-only aggregates, and hiding reviews.
- [x] 2.3 Implement audience/public use cases for `GET /concerts/:slug/reviews`, `POST /concerts/:slug/reviews`, `PATCH /concerts/:slug/reviews/me`, and `DELETE /concerts/:slug/reviews/me`.
- [x] 2.4 Implement admin hide use case for `PATCH /admin/concerts/:concertId/reviews/:reviewId/hide`.
- [x] 2.5 Add HTTP controllers, DTOs, auth guards, role guards, and error mapping using existing backend patterns.
- [x] 2.6 Wire the review capability into the backend module graph without coupling it to payment, order transition, or ticket issuance code.

## 3. Audience Web UI

- [x] 3.1 Add audience API client functions/types for loading review summary/list and mutating the current user's review.
- [x] 3.2 Add a review section to the event detail page showing average rating, review count, visible review list, and empty state.
- [x] 3.3 Add eligible-user review form with 1-5 star selection, comment input, validation feedback, and submit handling.
- [x] 3.4 Add edit/delete controls for the authenticated user's existing review.
- [x] 3.5 Refresh review list and aggregate after create, update, or delete without disrupting ticket selection/checkout UI.

## 4. Admin Moderation

- [x] 4.1 Expose admin-only hide review API and verify organizer/audience roles are rejected.
- [x] 4.2 Add a lightweight admin hide button only if an existing admin review/listing pattern fits cleanly.
- [x] 4.3 If admin UI is not added, document the moderation API handoff and how it can be called from future admin screens.

Note: Admin UI is implemented as a lightweight moderation section inside the existing admin concert detail panel. The handoff document remains as API reference for future dedicated moderation screens.

## 5. Tests And Verification

- [x] 5.1 Add backend tests for unauthenticated create rejection and no-issued-ticket create rejection.
- [x] 5.2 Add backend tests for issued-ticket create success and duplicate review rejection, including unique-constraint behavior.
- [x] 5.3 Add backend tests for rating/comment validation.
- [x] 5.4 Add backend tests for public list and aggregate using only `VISIBLE` reviews.
- [x] 5.5 Add backend tests for update/delete ownership rules.
- [x] 5.6 Add backend tests for admin hide success and non-admin rejection.
- [x] 5.7 Add audience web tests for rendering review summary/list, empty state, eligible form, and edit/delete controls.
- [x] 5.8 Run focused verification for changed backend and audience web tests; note any broader unrelated failures separately.
