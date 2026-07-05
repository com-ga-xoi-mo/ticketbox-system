## 1. Database Schema & Migrations

- [x] 1.1 Add `LISTED_FOR_RESALE` and `TRANSFERRED` values to `TicketStatus` enum in Prisma schema
- [x] 1.2 Add `transferredAt` field to `Ticket` model
- [x] 1.3 Add `resaleEnabled` and `resaleMaxPricePercent` fields to `Concert` model (default `false` and `110`)
- [x] 1.4 Create `ResaleListingStatus` enum (`ACTIVE`, `SOLD`, `CANCELLED`, `EXPIRED`) and `ResaleListing` model with fields: id, ticketId, sellerId, concertId, ticketTypeId, askingPriceVnd, originalPriceVnd, status, upvoteCount, commentCount, createdAt, updatedAt, expiresAt, soldAt, cancelledAt
- [x] 1.5 Create `PayoutStatus` enum (`PENDING`, `PROCESSED`) and `ResaleTransaction` model with fields: id, listingId, sellerTicketId, buyerTicketId, buyerId, sellerId, salePriceVnd, platformFeeVnd, sellerPayoutVnd, payoutStatus, payoutProcessedAt, createdAt
- [x] 1.6 Add `orderSourceType` field to `Order` model (enum `DIRECT`, `RESALE`, default `DIRECT`)
- [x] 1.7 Create `ListingUpvote` model: id, listingId, userId, createdAt — with unique constraint on (listingId, userId)
- [x] 1.8 Create `ListingComment` model: id, listingId, authorId, body, isHidden, flagCount, createdAt, updatedAt
- [x] 1.9 Create `ListingCommentReply` model: id, commentId, authorId, body, isHidden, flagCount, createdAt
- [x] 1.10 Create `CommentFlag` model: id, commentId, flaggedByUserId, createdAt — with unique constraint on (commentId, flaggedByUserId)
- [x] 1.11 Create `DirectMessageThread` model: id, listingId, buyerId, sellerId, isClosed, lastMessageAt, createdAt — with unique constraint on (listingId, buyerId, sellerId)
- [x] 1.12 Create `DirectMessage` model: id, threadId, senderId, body, isReadByRecipient, createdAt
- [x] 1.13 Create `SellerTrustProfile` model: id, userId, trustScore, completedSalesCount, avgResponseTimeMinutes, noShowRate, tier (enum: NEW, TRUSTED, HIGHLY_TRUSTED, TOP_SELLER), lastComputedAt
- [x] 1.14 Generate and apply Prisma migration via `npx prisma migrate dev`
- [x] 1.15 **Verify**: Run `npx prisma migrate status` — all migrations applied with no pending drift. Run seed script and confirm it completes without errors. Run `npx prisma validate` — schema valid.

## 2. Resale Module Scaffolding

- [x] 2.1 Create `packages/backend/src/resale/` module with sub-modules: `listings/`, `social/`, `messaging/`, `transfer/`, `trust/`
- [x] 2.2 Register `ResaleModule` in the app module
- [x] 2.3 Add Zod schemas for all resale API request/response DTOs in `@ticketbox/api-types`
- [x] 2.4 Install `@nestjs/platform-socket.io` and `socket.io-adapter-redis` dependencies; configure NestJS WebSocket gateway (`ResaleMessagingGateway`) with Socket.io — **this gateway is for DM only, not for SSE community events**
- [x] 2.5 Install `@nestjs/sse` (or confirm NestJS built-in SSE support via `@Sse()` decorator); set up SSE controller method for listing community event streams — **SSE is for upvote/comment real-time updates only**
- [x] 2.6 **Verify**: `npm run build` passes with no TypeScript errors. Start the server locally and confirm `GET /health` responds. Confirm WebSocket gateway registers (log output shows `WebSocket server started`). Confirm SSE endpoint responds with `Content-Type: text/event-stream`.

## 3. Ticket Resale Listing (Seller Flow)

- [x] 3.1 Implement `ResaleListingService.createListing()` — validate ticket ownership, ISSUED status, resale-enabled event, cutoff window (2h before event), non-guest-list ticket, price cap enforcement; void QR token hash; transition ticket to `LISTED_FOR_RESALE`; create `ResaleListing` with status `ACTIVE`
- [x] 3.2 Implement `POST /resale/listings` endpoint with auth guard (AUDIENCE role), request validation, and error responses
- [x] 3.3 Implement `ResaleListingService.cancelListing()` — validate listing ownership and `ACTIVE` status; transition listing to `CANCELLED`; restore ticket to `ISSUED`; regenerate QR token hash
- [x] 3.4 Implement `DELETE /resale/listings/:id` endpoint with auth guard
- [x] 3.5 Implement `GET /me/resale/listings` endpoint — return authenticated user's listings with ticket and event details
- [x] 3.6 Write unit tests for `ResaleListingService`: successful listing, price cap rejection, non-owned ticket, non-ISSUED ticket, resale-disabled event, cutoff window, guest-list ticket, cancellation, cancellation of non-ACTIVE listing
- [x] 3.7 **Verify**: Run unit tests — all pass. Manually call `POST /resale/listings` with a valid ISSUED ticket (using a seed token) and confirm listing created with status `ACTIVE`, ticket transitions to `LISTED_FOR_RESALE`, and original `qrTokenHash` is voided in DB. Call `DELETE /resale/listings/:id` and confirm ticket restored to `ISSUED` with a new `qrTokenHash`.

## 4. Community Feed & Marketplace (Buyer Browsing)

- [x] 4.1 Implement `GET /resale/listings` endpoint — return `ACTIVE` listings as social feed posts with upvote count, comment count, seller trust badge; support `concertId` filter, sort modes (`trending`, `newest`, `price_asc`, `price_desc`), and pagination (`page`, `limit`)
- [x] 4.2 Implement trending score computation: `score = upvoteCount * 1.5 + commentCount * 0.5 - hoursOld * 0.1` (computed at query time via SQL expression — no stored score column)
- [x] 4.3 For authenticated requests, include `upvotedByMe` boolean per listing in feed response (LEFT JOIN on `ListingUpvote` filtered by current user)
- [x] 4.4 Implement `GET /resale/listings/:id` endpoint — return full listing detail including first page of comments (20), upvote count, seller trust tier, community engagement data
- [x] 4.5 Write unit tests: feed filtering by `concertId`, each sort mode produces correct order, pagination returns correct page and `hasMore`, non-ACTIVE listings excluded, `upvotedByMe` correct for authenticated vs anonymous
- [x] 4.6 **Verify**: Seed 5 listings with varying ages and upvote counts. Call `GET /resale/listings?concertId=<id>&sort=trending` — confirm order matches expected trending score ranking. Call with `sort=price_asc` — confirm ascending price order. Call `GET /resale/listings/:id` — confirm response includes `upvoteCount`, `commentCount`, `sellerTrustTier`, and first page of comments.

## 5. Resale Purchase & Transfer (Core Transaction)

- [x] 5.1 Implement `ResaleTransferService.executePurchase()` — within a single PostgreSQL transaction: acquire row lock (`SELECT ... FOR UPDATE`) on listing, validate `ACTIVE` status, validate buyer is not seller, transition listing to `SOLD`, transition seller's ticket to `TRANSFERRED` with `transferredAt`, create new `Ticket` for buyer with fresh QR token hash, create `ResaleTransaction` with 5% platform fee (floor rounding), create resale `Order` with `orderSourceType=RESALE`, close all DM threads on the listing
- [x] 5.2 Implement `POST /resale/purchase` endpoint with auth guard (AUDIENCE role)
- [x] 5.3 Write unit tests: successful purchase, self-purchase rejection, already-sold listing, expired listing, fee calculation with rounding edge cases, atomic rollback on partial failure
- [x] 5.4 Write integration test: concurrent purchase race — two parallel `POST /resale/purchase` requests on same listing; assert exactly one succeeds (listing `SOLD`) and one fails with "no longer available"
- [x] 5.5 **Verify**: Execute a full purchase flow manually end-to-end. Confirm: listing transitions to `SOLD`, seller's ticket transitions to `TRANSFERRED` (original `qrTokenHash` remains voided), buyer receives a new `Ticket` row with a distinct `qrTokenHash` and status `ISSUED`, `ResaleTransaction` created with correct `salePriceVnd`, `platformFeeVnd` (exactly 5% floored), `sellerPayoutVnd`. Run integration race test — confirm exactly one winner.

## 6. SSE — Community Real-Time Events (Upvotes & Comments)

> **Transport: Server-Sent Events (SSE)**. The endpoint `GET /resale/listings/:id/events` returns a persistent `text/event-stream`. The server pushes `upvote.updated` and `comment.added` events. Clients use the browser `EventSource` API and reconnect automatically. This is NOT WebSocket — no bidirectional channel needed for community feed events.

- [x] 6.1 Implement SSE endpoint `GET /resale/listings/:id/events` using NestJS `@Sse()` decorator — stream `upvote.updated` (`{ upvoteCount, upvotedByMe }`) and `comment.added` (`{ commentId, body, authorName, createdAt }`) events; include `id` field on each event for `Last-Event-ID` reconnect support
- [x] 6.2 Implement `POST /resale/listings/:id/upvote` — toggle upvote atomically (`upvoteCount` incremented/decremented in same DB transaction as `ListingUpvote` upsert/delete); after commit, publish `upvote.updated` event to all active SSE subscribers for that listing; validate not own listing, not non-ACTIVE; return `{ upvoteCount, upvotedByMe }`
- [x] 6.3 Implement `POST /resale/listings/:id/comments` — create top-level `ListingComment`; increment `commentCount` on listing atomically; after commit, publish `comment.added` event to SSE subscribers; notify seller via BullMQ email/push
- [x] 6.4 Implement `POST /resale/listings/:id/comments/:commentId/replies` — create `ListingCommentReply`; publish `comment.added` SSE event with `parentCommentId`; notify listing owner and parent comment author via BullMQ
- [x] 6.5 Implement `GET /resale/listings/:id/comments` — return paginated comment thread (top-level + nested replies, 20 per page); exclude `isHidden: true` comments from public response
- [x] 6.6 Implement `POST /resale/listings/:id/comments/:commentId/flag` — record flag in `CommentFlag`; if `flagCount` reaches 3, set `isHidden: true` on comment atomically; enforce one flag per user per comment (unique constraint)
- [x] 6.7 Write unit tests: upvote toggle (add then remove), self-upvote rejection, upvote on non-ACTIVE listing, `upvoteCount` consistency after concurrent toggles, comment creation, reply creation, flag threshold hiding at exactly 3 flags, duplicate flag rejected by DB constraint
- [x] 6.8 Write integration test: open SSE stream for a listing, POST an upvote, assert `upvote.updated` event received on stream within 2 seconds with correct `upvoteCount`. POST a comment, assert `comment.added` event received.
- [x] 6.9 **Verify**: Using `curl -N` or a browser `EventSource`, connect to `GET /resale/listings/:id/events` and confirm `text/event-stream` content type and keep-alive. Toggle upvote via `POST /resale/listings/:id/upvote` and confirm SSE event arrives. Disconnect and reconnect with `Last-Event-ID` header — confirm server handles reconnect without error. Simulate SSE fallback: disable stream and confirm client polls `GET /resale/listings/:id` every 15s for updated counts.

## 7. WebSocket — Direct Messaging

> **Transport: WebSocket (Socket.io)**. Required because DMs are bidirectional: clients both send messages and receive real-time delivery. The NestJS `ResaleMessagingGateway` uses Socket.io with a Redis pub/sub adapter (existing Redis instance) for multi-instance support. Each user joins room `user:<userId>` on authentication. **This gateway is for DM only — community feed events use SSE (see section 6).**

- [x] 7.1 Configure Socket.io Redis adapter in `ResaleMessagingGateway` using the existing Redis connection — required for horizontal scaling; without it, WS events only reach users connected to the same server instance
- [x] 7.2 Implement gateway connection handler: authenticate JWT from handshake `auth.token`; reject unauthenticated sockets with `WsException`; join authenticated user to room `user:<userId>`
- [x] 7.3 Implement `POST /resale/listings/:id/messages` HTTP endpoint — initiate or append to `DirectMessageThread` scoped to `(listingId, buyerId, sellerId)`; persist `DirectMessage`; after commit, emit `message.new` event to recipient's room `user:<recipientId>` via Socket.io; enqueue BullMQ email/push notification for offline recipients
- [x] 7.4 Implement `POST /resale/listings/:id/messages/:threadId` HTTP endpoint — seller or buyer appends reply; same emit + BullMQ notification logic; validate sender is thread participant
- [x] 7.5 Implement `GET /me/messages/threads` — return all DM threads for authenticated user (buyer or seller), ordered by `lastMessageAt` descending; include listing context, other party display name, last message preview, `unreadCount`
- [x] 7.6 Implement `GET /resale/listings/:id/messages/:threadId` — return all messages ordered by `createdAt` ascending; restrict to thread participants only; mark all unread messages as `isReadByRecipient=true` for the requesting user
- [x] 7.7 Implement DM thread auto-close: when listing transitions to `SOLD` or `EXPIRED`, set `isClosed=true` on all its threads; reject new messages on closed threads with a controlled error
- [x] 7.8 Enforce message validation: body must be non-empty, plain text, max 1000 characters; reject with validation error otherwise
- [x] 7.9 Write unit tests: thread creation, thread append, self-message rejection, closed-thread message rejection, unauthorized thread read, `isReadByRecipient` marked on read, length limit validation, empty body rejection
- [x] 7.10 Write integration test: connect two Socket.io test clients (buyer and seller); buyer POSTs message; assert seller's socket receives `message.new` event with correct payload within 1 second; assert DB record created and `isReadByRecipient=false`
- [x] 7.11 Write integration test: Redis adapter multi-instance — start two gateway instances sharing Redis; buyer connected to instance A, seller to instance B; buyer sends message; assert seller (on instance B) receives `message.new` via Redis pub/sub
- [x] 7.12 **Verify**: Connect a Socket.io client manually (e.g., using `socket.io-client` in a test script). Authenticate with a valid JWT. Confirm socket joins room `user:<userId>`. Send a DM via `POST /resale/listings/:id/messages` from a different user and confirm the `message.new` event arrives on the connected socket. Disconnect the socket, send a message, confirm BullMQ email job enqueued (check BullMQ dashboard). Reconnect and confirm polling fallback `GET /me/messages/threads` returns the unread message.

## 8. Seller Trust Profile

- [x] 8.1 Create `compute-seller-trust` BullMQ job — query `ResaleTransaction`, `DirectMessage`, and `ResaleListing` tables for the seller; compute `completedSalesCount`, `avgResponseTimeMinutes` (time from first buyer message to first seller reply per thread), `noShowRate` (EXPIRED listings / total listings); derive `trustScore` (0–100) and `tier`; upsert `SellerTrustProfile`
- [x] 8.2 Enqueue `compute-seller-trust` after: resale transaction completes (`SOLD`), listing expires (`EXPIRED`), seller sends first reply to a DM thread (response time input)
- [x] 8.3 Implement `GET /sellers/:userId/profile` — return display name, trust tier badge, `completedSalesCount`, `memberSince`, current ACTIVE listings; exclude all PII (no email, phone, full name)
- [x] 8.4 Write unit tests: trust score formula — high sales + fast response + zero no-shows → high score; zero sales → `tier=NEW`; tier threshold boundary conditions
- [x] 8.5 Write unit tests: profile API — PII fields absent from response, empty active listings, user with no sales returns `tier: 'NEW'` and no `SellerTrustProfile` row
- [x] 8.6 **Verify**: Complete a resale transaction with a seeded seller. Confirm `compute-seller-trust` job enqueued in BullMQ. Process the job and confirm `SellerTrustProfile` row created/updated with correct `completedSalesCount` and tier. Call `GET /sellers/:userId/profile` and confirm no PII in response, correct tier badge returned.

## 9. Listing Auto-Expiry Worker

- [x] 9.1 Create BullMQ cron job `resale-listing-expiry` — query `ACTIVE` listings where `expiresAt <= now()`; for each: transition listing to `EXPIRED`, restore ticket to `ISSUED`, regenerate `qrTokenHash`, set `isClosed=true` on all DM threads, enqueue `compute-seller-trust` for noShowRate update, enqueue seller notification (email/push)
- [x] 9.2 Register cron with 15-minute repeat interval in the worker module
- [x] 9.3 Write unit tests: eligible listing transitions to EXPIRED, ticket restored with new QR, DM threads closed, `SOLD`/`CANCELLED` listings skipped, idempotency (re-running job on already-EXPIRED listing is a no-op)
- [x] 9.4 **Verify**: Create a listing with `expiresAt` set to 1 minute in the past. Trigger the cron job manually (or wait for next run). Confirm: listing status is `EXPIRED`, ticket is `ISSUED` with a new `qrTokenHash` different from the voided one, DM threads `isClosed=true`, BullMQ trust job enqueued for the seller.

## 10. Order Model Extension

- [x] 10.1 Update reservation-expiry worker query to filter `WHERE orderSourceType = 'DIRECT'` — skip `RESALE` orders
- [x] 10.2 Confirm resale orders created in task 5.1 have `reservationExpiresAt=null`, `promotionId=null`, `serviceFeeVnd=0`
- [x] 10.3 Write unit tests: resale order excluded from expiry scan, promo validation rejects resale order
- [x] 10.4 **Verify**: Create a resale order in DB. Run the reservation-expiry worker. Confirm the resale order is untouched (status unchanged, no expiry event emitted).

## 11. Organizer Resale Configuration

- [x] 11.1 Add `resaleEnabled` and `resaleMaxPricePercent` fields to concert create/update API and DTOs
- [x] 11.2 Validate `resaleMaxPricePercent` is between 100 and 200 (inclusive); reject otherwise
- [x] 11.3 Confirm existing seeded concerts have `resaleEnabled=false` in DB after migration
- [x] 11.4 **Verify**: Create a concert via API with `resaleEnabled=true`, `resaleMaxPricePercent=105`. Attempt to list a ticket with asking price at 106% of face value — confirm rejection. Attempt at 105% — confirm accepted.

## 12. API Types & Contracts

- [ ] 12.1 Add resale listing types: `ResaleListingFeedItem`, `ResaleListingDetail`, `CreateResaleListingRequest`, `ResalePurchaseRequest`, `ResaleTransactionResponse`
- [ ] 12.2 Add social types: `ListingCommentResponse`, `ListingCommentReplyResponse`, `UpvoteResponse`
- [ ] 12.3 Add SSE event payload types: `UpvoteUpdatedEvent`, `CommentAddedEvent` — document that these are SSE payloads, not REST responses
- [ ] 12.4 Add WebSocket event payload type: `MessageNewEvent` — document that this is a Socket.io event payload emitted to `user:<userId>` room
- [ ] 12.5 Add messaging types: `DirectMessageThreadResponse`, `DirectMessageResponse`, `SendMessageRequest`
- [ ] 12.6 Add trust types: `SellerProfileResponse`, `SellerTrustTier` enum (`NEW`, `TRUSTED`, `HIGHLY_TRUSTED`, `TOP_SELLER`)
- [ ] 12.7 Add `LISTED_FOR_RESALE` and `TRANSFERRED` to `TicketStatus` type definitions
- [ ] 12.8 Add `orderSourceType` (`DIRECT` | `RESALE`) to order type definitions
- [ ] 12.9 **Verify**: `npm run build` in `packages/api-types` — no TypeScript errors. Import types in a backend service file and confirm IDE resolves without errors.

## 13. Audience Web — Ticket Wallet Updates

- [ ] 13.1 Add `LISTED_FOR_RESALE` (orange "Đang bán lại") and `TRANSFERRED` (gray "Đã chuyển nhượng") status badges to the ticket status badge component
- [ ] 13.2 Implement "Bán lại vé" button on ticket detail — visible only when ticket is `ISSUED`, event has `resaleEnabled=true`, and event starts more than 2 hours from now
- [ ] 13.3 Implement resale listing form: display face value, computed max allowed price, price input with validation, submit calling `POST /resale/listings`
- [ ] 13.4 Update ticket detail for `LISTED_FOR_RESALE` status: hide QR, show asking price, listing date, upvote count, comment count, and "Hủy bán" button calling `DELETE /resale/listings/:id`
- [ ] 13.5 Update ticket detail for `TRANSFERRED` status: hide QR, show transfer date, sale price, payout amount, payout status
- [ ] 13.6 Add resale API client `shared/api/resale.ts`: `createResaleListing`, `cancelResaleListing`, `fetchMyResaleListings`, hooks `useMyResaleListings`
- [ ] 13.7 **Verify**: With a seeded ISSUED ticket for a resale-enabled event, confirm "Bán lại vé" button appears. Submit listing form — confirm button disappears, status badge changes to orange "Đang bán lại", QR hidden. Cancel the listing — confirm ticket restores to green "Hợp lệ" badge with QR visible.

## 14. Audience Web — Community Marketplace Page

- [ ] 14.1 Create `/events/:slug/resale` page — fetch listings via `GET /resale/listings?concertId=<id>` with infinite scroll (20 per page, load more on scroll-to-bottom)
- [ ] 14.2 Implement listing card: seller display name + trust badge, ticket type, asking price, original face value, "Verified by TicketBox" badge, upvote button with count, comment count chip, "Message" button, "Buy" button
- [ ] 14.3 Implement sort tabs: Trending, Newest, Price ↑, Price ↓ — switching tab re-fetches with new `sort` param
- [ ] 14.4 Implement upvote button — on click calls `POST /resale/listings/:id/upvote`; subscribes to SSE stream `GET /resale/listings/:id/events` to receive `upvote.updated` events and update count in real time without page refresh; falls back to polling if `EventSource` fails
- [ ] 14.5 Implement listing detail page `/events/:slug/resale/:listingId` — show full detail, upvote toggle (SSE-connected), "Message Seller" button, seller profile link, comment thread with reply/flag, purchase flow (confirmation modal → payment → success state with link to new ticket in wallet)
- [ ] 14.6 Implement comment thread component: paginated top-level comments + nested replies; "Reply" and "Flag" actions per comment; new comment input; subscribe to SSE `comment.added` events and prepend new comments in real time
- [ ] 14.7 Handle unauthenticated state: social action buttons (Upvote, Comment, Message, Buy) redirect to login with return URL
- [ ] 14.8 Handle resale-disabled event: show "Resale not available" message and hide listing feed
- [ ] 14.9 **Verify**: Open marketplace page in browser. Confirm listings render in trending order. Switch to Newest sort — confirm re-fetch. Scroll to bottom — confirm next page loads and appends. Open a listing detail, connect DevTools Network tab and confirm `GET /resale/listings/:id/events` shows a persistent SSE connection. Upvote from another browser tab — confirm upvote count updates in the first tab via SSE without refresh.

## 15. Audience Web — DM Inbox

- [ ] 15.1 Create DM inbox page `/account/messages` — list all threads via `GET /me/messages/threads`, ordered by `lastMessageAt`, with unread count badge per thread
- [ ] 15.2 Implement thread conversation view `/account/messages/:threadId` — display messages chronologically, message input at bottom, send calls `POST /resale/listings/:id/messages/:threadId`
- [ ] 15.3 Implement Socket.io client: connect on user login with JWT auth token; subscribe to `message.new` event on personal room; on event received, update unread count in inbox and append message to open thread if viewing it — **WebSocket only, not SSE**
- [ ] 15.4 Show global unread DM badge in navigation bar (derived from total `unreadCount` across all threads)
- [ ] 15.5 Implement polling fallback: if Socket.io connection fails, poll `GET /me/messages/threads` every 30 seconds for unread count updates
- [ ] 15.6 Add messaging API client `shared/api/messaging.ts`: `fetchMyThreads`, `fetchThreadMessages`, `sendMessage`, hooks `useMyThreads`, `useThreadMessages`
- [ ] 15.7 **Verify**: Open inbox in browser tab A (buyer) and tab B (seller). From tab A, send a message via `POST`. Confirm: tab B's Socket.io client receives `message.new` event and the new message appears in the conversation view without refresh. Confirm unread badge appears in tab B's nav. Open the thread in tab B — confirm badge clears. Disconnect tab B's socket (disable network briefly) — confirm polling fallback activates and the message eventually appears within 30 seconds.

## 16. Audience Web — Seller Profile Page

- [ ] 16.1 Create public seller profile page `/sellers/:userId` — fetch via `GET /sellers/:userId/profile`; display trust badge, completed sales count, member since, active listings grid
- [ ] 16.2 Link seller display name on listing cards and detail pages to `/sellers/:userId`
- [ ] 16.3 Add seller profile API client: `fetchSellerProfile`, hook `useSellerProfile`
- [ ] 16.4 **Verify**: Navigate to a seller's profile page. Confirm trust tier badge matches the `tier` from the API. Confirm no PII visible (no email, phone). Confirm active listings grid matches `GET /resale/listings?sellerId=<id>`.

## 17. Seller Payout & Transaction History

- [ ] 17.1 Implement `GET /me/resale/transactions` — return seller's completed transactions with sale price, platform fee, payout amount, payout status
- [ ] 17.2 Add admin endpoint `PATCH /admin/resale/transactions/:id/payout` — transition payout status `PENDING` → `PROCESSED` with `payoutProcessedAt` timestamp; restrict to ADMIN role
- [ ] 17.3 Add transaction history UI in audience web account section
- [ ] 17.4 **Verify**: Complete a resale transaction. Call `GET /me/resale/transactions` as the seller — confirm transaction appears with correct amounts and `payoutStatus: PENDING`. Call admin payout endpoint — confirm status transitions to `PROCESSED` and `payoutProcessedAt` is set.

## 18. End-to-End Verification

- [ ] 18.1 E2E test — full resale lifecycle: seller lists ticket → buyer opens SSE stream → buyer upvotes (assert SSE `upvote.updated` received) → buyer comments (assert SSE `comment.added` received) → buyer sends DM (assert seller receives `message.new` via WebSocket) → buyer purchases → assert: listing `SOLD`, seller ticket `TRANSFERRED`, buyer ticket `ISSUED` with new QR, `ResaleTransaction` created with correct fee split
- [ ] 18.2 E2E test — SSE reconnect: open SSE stream, force disconnect (close connection), reconnect with `Last-Event-ID`, trigger upvote, assert event received after reconnect
- [ ] 18.3 E2E test — WebSocket Redis multi-instance: two server instances with shared Redis; buyer on instance A, seller on instance B; buyer sends DM; assert seller receives `message.new` via Redis pub/sub routing
- [ ] 18.4 E2E test — listing cancellation: seller lists → cancels → assert ticket `ISSUED` with new `qrTokenHash` (different from voided one), all existing comments still readable, DM threads not auto-closed (listing cancelled before sale, not sold/expired)
- [ ] 18.5 E2E test — auto-expiry: set listing `expiresAt` to past → run expiry job → assert listing `EXPIRED`, ticket `ISSUED` with new QR, DM threads closed, trust score job enqueued
- [ ] 18.6 E2E test — comment flagging: 3 different users flag same comment → assert `isHidden=true` after 3rd flag, comment absent from `GET /resale/listings/:id/comments` response
- [ ] 18.7 E2E test — concurrent purchase: two parallel `POST /resale/purchase` on same listing → assert exactly one succeeds, one fails with listing-no-longer-available error, no duplicate `ResaleTransaction` created
- [ ] 18.8 Verify: resale orders excluded from reservation expiry worker scan (run worker, confirm RESALE orders untouched)
- [ ] 18.9 Verify: price cap across default (110%) and custom event cap configurations — 3 scenarios: at cap, above cap, custom cap
- [ ] 18.10 Verify: seller trust profile tiers computed correctly — seed scenarios for each tier boundary and confirm `compute-seller-trust` job produces expected tier

## 19. Refactor Resale Module to Clean Architecture (Tech Debt)

- [x] 19.1 Create Clean Architecture folder structure for `resale` module (`domain/`, `application/`, `infrastructure/`, `adapters/`).
- [x] 19.2 Define Domain Entities and Ports (`IResaleListingRepository`, `IResaleTransactionRepository`, etc.) in `domain/ports/`.
- [x] 19.3 Refactor Resale Listing business logic into separate use-cases inside `application/use-cases/` (e.g., `create-listing.use-case.ts`, `cancel-listing.use-case.ts`, `get-feed.use-case.ts`).
- [x] 19.4 Refactor Resale Purchase business logic into `execute-purchase.use-case.ts`.
- [x] 19.5 Refactor Social business logic into use-cases (e.g., `toggle-upvote.use-case.ts`, `add-comment.use-case.ts`).
- [x] 19.6 Refactor Messaging business logic into use-cases (e.g., `send-message.use-case.ts`, `get-my-threads.use-case.ts`).
- [x] 19.7 Refactor Trust Profile logic into `compute-trust-score.use-case.ts` and `get-seller-profile.use-case.ts`.
- [x] 19.8 Move database logic to `infrastructure/database/prisma-resale.repository.ts`.
- [x] 19.9 Move queue logic to `infrastructure/queue/`.
- [x] 19.10 Move HTTP controllers and WebSocket gateway to `adapters/http/` and `adapters/websocket/`.
- [x] 19.11 Update `resale.module.ts` to wire dependency injection using defined tokens.
- [x] 19.12 Fix unit tests to mock repository interfaces instead of `PrismaService`.
