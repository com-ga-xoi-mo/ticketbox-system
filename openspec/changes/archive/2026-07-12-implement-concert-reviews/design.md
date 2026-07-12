## Context

TicketBox already has the core purchase flow, issued tickets, public concert detail pages, audience web pages, and admin role boundaries. There is no concert-level review model yet. Existing resale listing comments are scoped to resale listings and should not be reused because concert reviews require verified purchase eligibility, one-review-per-concert ownership, aggregate ratings, and admin hide moderation.

This change adds a small review capability around existing concerts and tickets. It must stay independent from payment, order transitions, ticket issuance, and check-in.

## Goals / Non-Goals

**Goals:**

- Allow authenticated audience users with at least one `ISSUED` ticket for a concert to create one review for that concert.
- Support rating 1-5 plus a bounded text comment.
- Expose public visible review list and visible-only aggregate rating/count.
- Let review owners update or delete their own review.
- Let admins hide violating reviews without deleting audit information.
- Add audience event detail UI using existing app patterns.
- Keep duplicate requests from creating duplicate reviews.

**Non-Goals:**

- No organizer moderation in this change.
- No concert-ended gate or new `endsAt` dependency.
- No realtime comments, like/dislike, threaded replies, or report workflow.
- No changes to payment, order lifecycle, ticket issuance, payout, or settlement.
- No complex admin review-management UI unless an existing admin pattern makes it cheap.

## Decisions

### Decision 1: Add a dedicated `concert_reviews` table

The review data will live in a new PostgreSQL table instead of overloading existing ticket, order, or resale comment tables.

Minimum fields:

- `id`
- `concertId`
- `userId`
- `rating`
- `comment`
- `status` (`VISIBLE` or `HIDDEN`)
- `hiddenAt`
- `hiddenByUserId`
- `hiddenReason`
- `createdAt`
- `updatedAt`

The table will have a unique constraint on `(concertId, userId)`.

Rationale:

- Reviews have their own lifecycle and moderation state.
- The unique constraint gives a database-level guarantee for one review per user per concert.
- Keeping hidden review rows preserves moderation audit data.

Alternatives considered:

- Reuse resale listing comments: rejected because resale comments are public discussions and do not encode verified purchase eligibility or rating aggregates.
- Store reviews as JSON on concerts: rejected because ownership, moderation, pagination, and uniqueness would be weaker.

### Decision 2: Eligibility is based on issued tickets

A user may create or edit a review only if they have at least one ticket where:

- `ticket.userId` equals the authenticated user
- `ticket.concertId` equals the reviewed concert
- `ticket.status` is `ISSUED`

Rationale:

- This aligns with the requested "audience da mua ve ISSUED" rule.
- It avoids coupling review creation to payment internals.
- If later ticket statuses such as `CHECKED_IN` should also qualify, that can be a separate spec change.

Alternatives considered:

- Use paid order status: rejected because issued tickets are the stronger evidence that the buyer actually received usable tickets.
- Require the concert to end: explicitly out of scope.

### Decision 3: Separate public, audience, and admin APIs

Public/audience APIs:

- `GET /concerts/:slug/reviews`
- `POST /concerts/:slug/reviews`
- `PATCH /concerts/:slug/reviews/me`
- `DELETE /concerts/:slug/reviews/me`

Admin API:

- `PATCH /admin/concerts/:concertId/reviews/:reviewId/hide`

Rationale:

- Public listing naturally belongs beside the public concert detail route.
- Owner mutation uses `/me` semantics so a user cannot target someone else's review by ID.
- Admin moderation uses concert ID and review ID for explicit moderation scope.

### Decision 4: Hidden reviews are excluded from public data and aggregates

Public list, average rating, and review count will only include `status = VISIBLE`.

Rationale:

- Admin hide should immediately remove violating content from audience-facing pages.
- Hidden rows stay in the database for audit and future admin review.

### Decision 5: Audience UI is part of this change; admin UI is optional handoff

The audience event detail page will show:

- average rating
- review count
- visible review list
- review form if the authenticated user is eligible
- edit/delete controls for the user's own review

Admin moderation will be implemented as backend API. A lightweight admin hide button may be added only if there is a clear existing UI pattern and it does not require building a new admin review-management screen.

Rationale:

- The user-facing value is on concert detail.
- Backend admin moderation is the required security boundary.
- Avoids a broad admin UI detour.

## Risks / Trade-offs

- [Risk] Eligibility queries can become expensive on popular concerts. -> Mitigation: query by indexed `tickets(userId, concertId, status)` or equivalent Prisma indexes, and only run eligibility for authenticated mutation/form state.
- [Risk] Duplicate create requests can race. -> Mitigation: enforce `(concertId, userId)` unique constraint and map unique violations to a controlled duplicate-review response.
- [Risk] Hidden reviews may still appear from stale client state. -> Mitigation: public APIs always filter `VISIBLE`; frontend should refetch after admin hide only where admin UI exists.
- [Risk] Average rating can be wrong if hidden reviews are counted. -> Mitigation: aggregate from `VISIBLE` reviews only and test it directly.
- [Risk] Admin UI scope can grow. -> Mitigation: implement the moderation API first and add admin UI only if it fits existing screens cleanly.

## Migration Plan

1. Add Prisma enum/table/indexes for `concert_reviews`.
2. Run Prisma migration and regenerate client.
3. Add backend review repository/use cases/controllers and API contracts.
4. Add audience concert detail review UI.
5. Add tests for eligibility, uniqueness, validation, visibility, aggregates, ownership, and admin hide.

Rollback:

- The feature is additive. Rollback can remove the review routes/UI usage while leaving the table unused. Full rollback requires dropping the new table and enum before deploying code that references them.

## Open Questions

- None. The change intentionally does not require concert end time, organizer moderation, or advanced reporting.
