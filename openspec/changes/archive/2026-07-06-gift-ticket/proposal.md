## Why

Users with tickets frequently want to gift them to friends or family for birthdays, special occasions, or as introductions to live events. The `Ticket` model already has `userId`, and the platform has no mechanism to transfer ownership — leaving a real user need unmet and a viral acquisition channel on the table.

## What Changes

- Add a `TicketTransfer` database table to track pending gift transfers with a token, TTL (48h), recipient identifier, and status (`PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`).
- Add API endpoints: initiate transfer, accept transfer, decline transfer, cancel transfer (by sender), and list my pending transfers.
- Ticket status gains a new value: `TRANSFER_PENDING` — displayed in the wallet while a transfer is in flight.
- On acceptance, ticket `userId` is atomically reassigned to the recipient (creates account if needed via email lookup).
- On decline or TTL expiry (worker job), the token is invalidated and the ticket reverts to `ISSUED` status.
- Email notifications are sent to recipient (invitation) and sender (outcome: accepted or declined).
- The `audience-ticket-wallet` UI gains a "Gift this ticket" action on eligible tickets, plus a pending-transfers management screen.

## Capabilities

### New Capabilities

- `ticket-gifting-api`: Backend REST API for initiating, accepting, declining, and canceling ticket gift transfers. Includes the `TicketTransfer` model and transfer token lifecycle.
- `ticket-gifting-ui`: Frontend UI in the audience ticket wallet — gift initiation flow, transfer-pending state display, and pending transfers management for the sender.

### Modified Capabilities

- `audience-ticket-wallet`: Ticket status display must handle the new `TRANSFER_PENDING` status; wallet adds "Gift" CTA and pending transfer management entry point.

## Impact

- **Database**: New `TicketTransfer` table; `Ticket.status` enum gains `TRANSFER_PENDING`.
- **API (`apps/api`)**: New routes under `/me/tickets/:id/transfer` and `/transfers/:token`.
- **Worker (`apps/worker`)**: New BullMQ job `ticket_transfer.expire` to sweep expired tokens and revert ticket status.
- **Notifications**: Two new email templates — gift invitation (to recipient) and transfer outcome (to sender).
- **Frontend (web app)**: UI changes in ticket wallet and ticket detail pages.
- **`packages/api-types`**: New Zod contracts for transfer request/response shapes.
