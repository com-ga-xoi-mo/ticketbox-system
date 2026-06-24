# Customer Ticket QR Frontend Handoff

This document defines the existing backend contract for the future audience ticket UI. The QR email delivery change does not modify `apps/web`.

## Authentication and ownership

Both endpoints require a valid audience JWT:

- `GET /me/tickets`
- `GET /me/tickets/:id`

The backend derives the owner from the authenticated user. A user cannot supply another user ID. Requesting a missing ticket or a ticket owned by another user returns `404`.

## List tickets

`GET /me/tickets` returns summaries for the authenticated user. Each item includes:

- `id`
- `ticketNumber`
- `orderId` and `orderNumber`
- `concertId`, `concertTitle`, and `concertStartsAt`
- `ticketTypeId`, `ticketTypeName`, and `ticketTypeCode`
- `status`
- `issuedAt`
- `checkedInAt`

The list response intentionally does not include `qrPayload`.

## Get ticket detail

`GET /me/tickets/:id` returns the same ticket fields plus:

```json
{
  "qrPayload": "<opaque signed ticket payload>"
}
```

The backend recreates this value from the ticket identity and `QR_TOKEN_SECRET`. The database stores only `qrTokenHash`, not the raw payload.

## Rendering rules

The frontend must:

1. Fetch ticket detail only when the authenticated owner opens a ticket.
2. Treat `qrPayload` as an opaque string.
3. Pass the exact string to a QR rendering library without decoding or modifying it.
4. Render a high-contrast QR with a quiet margin and enough size for gate scanning.
5. Clear ticket-detail query data when the user signs out.

The frontend must not:

- receive or use `QR_TOKEN_SECRET`;
- create or sign QR ticket tokens;
- store `qrPayload` in `localStorage`, IndexedDB, analytics, or application logs;
- place `qrPayload` in URLs or error reports;
- use the public ticket list response as a substitute for the protected detail endpoint.

## Email and web consistency

Purchase-confirmation email attachments and the ticket-detail endpoint recreate the same signed payload from the same persisted ticket fields. The frontend does not need to download or reuse the email image; it renders the `qrPayload` returned by the detail API.
