## Context

TicketBox is a concert ticketing platform built on NestJS + Prisma + PostgreSQL + BullMQ. The system already supports a complete ticket purchase lifecycle: inventory reservation, payment processing, QR e-ticket issuance, and check-in scanning. The `Ticket` model stores a `qrTokenHash` for secure gate entry.

This change extends the platform with two intertwined layers: (1) a **secure resale marketplace** where the platform mediates transfers and eliminates fraud, and (2) a **community social layer** built on top of listings — giving buyers social trust signals (upvotes, comments, seller reputation) and private communication tools (direct messaging) similar to how Facebook groups function today, but within the safety of the platform.

## Goals / Non-Goals

**Goals:**
- Allow ticket holders to list issued tickets for resale within the platform
- Provide a community feed of resale listings with engagement signals (upvotes, comments)
- Enable private direct messaging between buyers and sellers scoped to a listing
- Build a seller trust/reputation profile based on completed sales and community activity
- Enforce price caps (max 110% of face value) to prevent scalping
- Maintain QR code security: revoke on listing, issue fresh QR to buyer on transfer
- Generate platform revenue via 5% transaction fee on resale purchases
- Allow organizers to opt-in/out of resale per event

**Non-Goals:**
- Bidding or price negotiation through the platform (fixed asking price; DM is for clarification only)
- Partial ticket bundle resale
- Cross-event ticket swaps
- Automated seller payout disbursement (v1 is manual ledger)
- Resale of guest-list/complimentary tickets
- Full social network (following, global activity feeds unrelated to events)
- AI-powered content moderation (manual flagging only for v1)

## Decisions

### 1. Resale as a separate domain module, not embedded in ticket-purchase

**Decision**: Create a dedicated `resale` module (`packages/backend/src/resale/`) with its own service, controller, and repository layers.

**Rationale**: The resale flow has distinct business rules (price caps, listing lifecycle, transfer mechanics, social interactions) that would bloat the existing checkout module. A separate module keeps bounded contexts clean and allows independent iteration.

**Alternatives considered**:
- Extending the checkout module — rejected; tangles two distinct purchase flows.

### 2. Dedicated Prisma models for social layer — no reuse of generic tables

**Decision**: Introduce purpose-built models: `ListingUpvote`, `ListingComment`, `ListingCommentReply`, `DirectMessageThread`, `DirectMessage`. Do not build a generic "reactions" or "activity" table.

**Rationale**: Each social entity has clear, stable attributes. A generic polymorphic reactions table would add indirection and complicate queries without meaningful reuse in v1. Purpose-built models are easier to migrate and reason about.

**Alternatives considered**:
- Generic polymorphic reactions table — rejected; premature abstraction, harder to query efficiently.

### 3. Upvotes as interest signals, not quality votes

**Decision**: Upvotes on a listing represent "I am interested in this ticket", not a quality endorsement. There is no downvote. Each authenticated user can upvote a listing once (idempotent toggle — upvote again to remove).

**Rationale**: Downvotes on resale listings have no clear semantics (a listing is either valid or it's not). Interest signals (upvotes) serve as a useful feed ranking input and help sellers gauge demand. Keeping it as a toggle avoids negative social dynamics.

**Alternatives considered**:
- Upvote + downvote (Reddit style) — rejected; downvotes on listings are semantically ambiguous and could be abused to suppress legitimate sellers.

### 4. Comments are public threads per listing; DMs are private per buyer-seller pair

**Decision**: `ListingComment` is a public threaded discussion (top-level comment + replies) visible to all viewers of a listing. `DirectMessage` threads are private, scoped to a `(listingId, buyerId, sellerId)` triple — one thread per buyer per listing.

**Rationale**: Public comments allow community trust-building (other buyers can see answers, reducing repeat questions). Private DMs protect personal negotiation details. Scoping DM threads to a listing prevents spam and makes conversations contextual.

**Alternatives considered**:
- All communication public — rejected; sellers and buyers may need to share pickup/handoff details privately.
- Generic user-to-user DM (not listing-scoped) — rejected for v1; listing-scoped DMs keep context clear and limit abuse surface.

### 5. SSE for community events (upvotes, comments); WebSocket for direct messaging

**Decision**: Two distinct real-time transports are used, chosen per use-case:

- **Server-Sent Events (SSE)** — for community feed events: upvote count updates and new comments on a listing. Clients subscribe to `GET /resale/listings/:id/events` (a persistent SSE stream). The server pushes `upvote.updated` and `comment.added` events over this stream whenever the listing's engagement state changes. SSE is unidirectional (server → client), stateless on the server side, and reconnects automatically via the browser `EventSource` API.

- **WebSocket (Socket.io)** — for private direct messaging only. Bidirectional communication is required: the client sends a message and simultaneously the server must push delivery confirmation and the new message to the recipient's live session. The NestJS WebSocket gateway (`ResaleMessagingGateway`) uses Socket.io with a Redis adapter (Redis is already in the stack) for horizontal scalability. Each authenticated user joins a personal room `user:<userId>` upon connection. The server emits `message.new` to the recipient's room on every new DM.

**Why not WebSocket for everything?**: SSE is simpler to operate for broadcast/fan-out scenarios (many clients watching the same listing). It works over plain HTTP/2, requires no special server state per client, and survives load balancer restarts without sticky sessions. WebSocket is justified for DMs because the client must also send data (message content, read receipts) and needs sub-second delivery confirmation — a bidirectional channel.

**Why not SSE for DMs?**: SSE is server-to-client only; the client would still need a separate HTTP POST to send messages, making coordination with delivery confirmation more complex. WebSocket handles both directions atomically.

**Fallbacks**:
- SSE: If `EventSource` is not supported or the stream drops, the client falls back to polling `GET /resale/listings/:id` every 15 seconds for fresh engagement counts.
- WebSocket: If the socket is disconnected, new DM messages are delivered via the existing BullMQ email/push notification pipeline. The client can also poll `GET /me/messages/threads` every 30 seconds as a fallback.

**Alternatives considered**:
- WebSocket for everything — rejected; SSE is lower overhead for fan-out community events and avoids unnecessary bidirectional complexity for read-heavy listing views.
- Polling-only — rejected; too slow for time-sensitive DMs close to event date and would produce noisy upvote flicker in the community feed.
- Third-party messaging service (e.g., Sendbird) — rejected for v1; adds cost and external dependency.

### 6. Seller trust score is computed, not self-reported

**Decision**: `SellerTrustScore` is a read-only computed value derived from: number of completed resale transactions, average response time to DMs, and no-show rate (listings that expired without sale). It is recalculated asynchronously after each relevant event via a BullMQ job.

**Rationale**: Self-reported trust is worthless. Computed trust based on observable platform behavior is meaningful and tamper-proof.

**Alternatives considered**:
- Buyer ratings/reviews after transaction — useful future addition; deferred to v2.

### 7. QR code revocation on listing, new QR on transfer (unchanged from original design)

**Decision**: When a seller lists a ticket, immediately transition its status to `LISTED_FOR_RESALE` and void the existing `qrTokenHash`. On successful resale purchase, create a new `Ticket` record for the buyer with a fresh `qrTokenHash`, and transition the seller's original ticket to `TRANSFERRED`.

**Rationale**: Immediate QR revocation prevents the seller from using a listed ticket at the gate.

### 8. Price cap enforced server-side with per-event configuration (unchanged)

**Decision**: Default cap is 110% of `ticketType.priceVnd`. Organizers can configure a custom cap or disable resale via fields on the `Concert` model.

## Risks / Trade-offs

- **[Comment moderation]** Public comments could contain spam, offensive content, or attempts to share contact info to bypass the platform. → **Mitigation**: Users can flag comments; flagged comments are hidden pending review. Automated basic profanity filter optional in v2.

- **[DM abuse / off-platform deals]** Buyers and sellers may attempt to finalize deals outside the platform via DM. → **Mitigation**: DM guidelines prohibit sharing payment info; platform messaging reminds both parties that only platform-mediated transfers guarantee QR validity. No automated detection in v1.

- **[WebSocket scaling]** WebSocket connections increase server state. → **Mitigation**: Socket.io with Redis adapter (Redis is already in the stack) enables horizontal scaling. SSE streams for community events are stateless HTTP connections and scale naturally behind a standard load balancer.

- **[SSE reconnect on listing detail]** If the SSE stream disconnects (network blip, server restart), clients may miss upvote/comment events. → **Mitigation**: Browser `EventSource` auto-reconnects with `Last-Event-ID`; the reconnect payload re-fetches current `upvoteCount` and `commentCount` to resync state. A 15-second polling fallback activates if SSE is unavailable.

- **[Trust score gaming]** Sellers could attempt to inflate upvotes or manufactured positive signals. → **Mitigation**: Upvotes require authenticated users; one per user per listing; rate limiting on upvote endpoint.

- **[QR regeneration on delist]** Seller gets a different QR than original after cancellation. → **Mitigation**: Clear UI messaging + email/push notification with updated ticket.

- **[Concurrent purchase race]** Two buyers simultaneously purchase same listing. → **Mitigation**: PostgreSQL row-level locking on `ResaleListing` row; first wins, second gets "no longer available".

- **[Seller payout without automated disbursement]** V1 is manual ledger. → **Mitigation**: Clear messaging to sellers on expected payout timeline.

## Migration Plan

1. Deploy Prisma migrations (additive — no breaking changes to existing models)
2. Existing concerts default to `resaleEnabled=false`
3. Resale module and community endpoints deployed behind feature flag
4. WebSocket gateway deployed alongside existing HTTP server (same NestJS process, Redis adapter)
5. Rollback: disable feature flag; social models are additive and can remain without impact
