# resale-direct-messaging

## Purpose
TBD - Add purpose here.

## Requirements
### Requirement: Buyer can initiate a direct message thread with a seller
The system SHALL allow an authenticated AUDIENCE user to initiate a private direct message thread with a listing's seller via `POST /resale/listings/:id/messages`. Each thread is scoped to the tuple `(listingId, buyerId, sellerId)` — one thread per buyer per listing. Sending a message when a thread already exists SHALL append to the existing thread rather than creating a duplicate.

#### Scenario: Buyer initiates a new DM thread
- **WHEN** an authenticated buyer sends a message to a listing for the first time
- **THEN** the system SHALL create a `DirectMessageThread` scoped to `(listingId, buyerId, sellerId)`, create a `DirectMessage` record, and notify the seller

#### Scenario: Buyer sends a follow-up message to existing thread
- **WHEN** a buyer sends a message to a listing for which a thread already exists
- **THEN** the system SHALL append a new `DirectMessage` to the existing thread without creating a duplicate thread

#### Scenario: Seller replies to a DM thread
- **WHEN** the seller sends a message via `POST /resale/listings/:id/messages/:threadId`
- **THEN** the system SHALL append the reply to the thread and notify the buyer

#### Scenario: Seller cannot DM their own listing
- **WHEN** the listing owner attempts to send a message to their own listing
- **THEN** the system SHALL reject the request

#### Scenario: Unauthenticated user cannot send DMs
- **WHEN** an unauthenticated user attempts to send a message
- **THEN** the system SHALL reject the request with 401 Unauthorized

#### Scenario: DMs on a sold or expired listing are rejected
- **WHEN** a user attempts to send a new message on a listing that is `SOLD`, `CANCELLED`, or `EXPIRED`
- **THEN** the system SHALL reject the request; existing threads remain readable

### Requirement: Users can view their DM inbox
The system SHALL allow an authenticated user to view all their DM threads via `GET /me/messages/threads`. The response SHALL include the listing context (event name, ticket type, asking price), the other party's display name, the last message preview, and unread message count per thread.

#### Scenario: Buyer views inbox with active threads
- **WHEN** an authenticated buyer requests their DM inbox
- **THEN** the system SHALL return all threads where the user is either the buyer or seller, ordered by last message timestamp descending

#### Scenario: Unread count displayed per thread
- **WHEN** a user has received messages they have not yet read in a thread
- **THEN** the `unreadCount` for that thread SHALL be greater than 0

#### Scenario: Empty inbox
- **WHEN** a user has no DM threads
- **THEN** the system SHALL return an empty list

### Requirement: Messages within a thread are readable by both parties
The system SHALL expose `GET /resale/listings/:id/messages/:threadId` returning all messages in a thread. Only the buyer and seller of that thread SHALL be able to access it. Fetching a thread SHALL mark all unread messages in it as read for the requesting user.

#### Scenario: Thread owner reads messages
- **WHEN** the buyer or seller requests `GET /resale/listings/:id/messages/:threadId`
- **THEN** the system SHALL return all messages ordered by timestamp ascending and mark previously unread messages as read

#### Scenario: Third party cannot read a thread
- **WHEN** a user who is neither the buyer nor the seller requests a thread
- **THEN** the system SHALL reject the request with a not-found error

### Requirement: Real-time message delivery via WebSocket
The system SHALL deliver new DMs in real time to connected clients via a WebSocket gateway. When a new message is sent, the system SHALL emit a `message.new` event to the recipient's socket room if they are connected. If the recipient is not connected, the message SHALL be delivered via email/push notification via the existing BullMQ pipeline.

#### Scenario: Connected recipient receives message in real time
- **WHEN** a buyer sends a message and the seller is connected via WebSocket
- **THEN** the system SHALL emit a `message.new` event to the seller's socket room within 1 second

#### Scenario: Disconnected recipient receives email notification
- **WHEN** a buyer sends a message and the seller is not connected via WebSocket
- **THEN** the system SHALL enqueue an email/push notification to the seller via BullMQ

#### Scenario: Sender does not receive their own event
- **WHEN** a user sends a message
- **THEN** the `message.new` event SHALL only be emitted to the recipient, not back to the sender

### Requirement: DM message content is plain text with length limit
The system SHALL enforce that DM message bodies are plain text, non-empty, and do not exceed 1000 characters. No HTML, markdown, or rich text is rendered. Messages are displayed as raw text to prevent injection.

#### Scenario: Message exceeding length limit is rejected
- **WHEN** a user sends a message body longer than 1000 characters
- **THEN** the system SHALL reject the request with a validation error indicating the length limit

#### Scenario: Empty message is rejected
- **WHEN** a user sends a message with an empty or whitespace-only body
- **THEN** the system SHALL reject the request with a validation error
