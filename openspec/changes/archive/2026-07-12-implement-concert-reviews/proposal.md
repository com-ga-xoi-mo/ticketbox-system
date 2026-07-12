## Why

TicketBox currently lets audiences buy and receive tickets, but it does not capture post-purchase social proof for concerts. Adding concert reviews gives buyers a way to rate and comment on events while keeping public content moderated by admins.

## What Changes

- Add audience concert reviews with 1-5 star ratings and comments.
- Allow only authenticated users with at least one `ISSUED` ticket for the concert to create a review.
- Enforce one review per user per concert with database and application-level checks.
- Allow the review owner to update or delete their own review.
- Add public review listing and rating summary that only include `VISIBLE` reviews.
- Add admin-only moderation API to hide violating reviews.
- Add audience concert detail UI for average rating, review count, visible reviews, and eligible-user review form.
- Keep reviews independent from payment, order lifecycle, ticket issuance, and check-in flows.

## Capabilities

### New Capabilities

- `concert-reviews`: Audience-owned concert rating/comment lifecycle, purchase eligibility, public visibility, aggregate rating, and admin hide moderation.

### Modified Capabilities

- `audience-event-detail`: Show concert review summary/list and eligible-user review actions on the public concert detail page.

## Impact

- Adds Prisma schema/migration for `concert_reviews` and a review status enum.
- Adds backend review repository/use cases/controllers, validation, authorization, and API contracts.
- Adds audience web concert detail review UI using existing project styles and client API patterns.
- Adds admin-only hide endpoint; admin UI integration is limited to a lightweight button only if an existing pattern fits cleanly.
- Adds tests for eligibility, uniqueness, validation, public visibility, aggregate calculation, ownership, and admin moderation.
