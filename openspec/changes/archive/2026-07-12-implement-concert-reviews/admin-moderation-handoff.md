## Admin Review Moderation Handoff

This change exposes the backend moderation API but does not add a full admin review management screen.

Endpoint:

```http
PATCH /admin/concerts/:concertId/reviews/:reviewId/hide
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Violation reason"
}
```

Behavior:

- Only users with the `ADMIN` role can hide a review.
- Hidden reviews keep their database row with `status = HIDDEN`.
- Public concert review APIs only return `VISIBLE` reviews.
- Average rating and review count only include `VISIBLE` reviews.
- Repeating hide on an already hidden review is safe and updates the hide metadata.

Suggested future UI:

- Add a review moderation tab under admin concert detail.
- Show rating, comment, author, created time, and current visibility status.
- Add a lightweight "Hide" action with an optional reason dialog.
