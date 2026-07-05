## Why

Ticket holders who can no longer attend an event are forced to resell through Facebook groups and chat channels, exposing both sellers and buyers to high fraud risk (fake tickets, payment scams). Beyond fraud, these informal channels also suffer from poor discoverability, no trust signals, and no structured way for buyers to ask questions or gauge seller credibility. There is currently no official channel for safe, community-driven ticket resale. An integrated first-party resale marketplace within TicketBox — built around a community feed with social interactions (upvotes, comments, direct messaging) — eliminates fraud risk, builds buyer confidence through community trust signals, and generates an additional 5% transaction fee revenue stream for the platform.

## What Changes

- **Community resale feed**: A social-media-style feed where sellers post their ticket listings as "posts". Buyers can browse, upvote listings they are interested in, leave public comments, and message the seller directly — all within TicketBox.
- **New "Sell My Ticket" flow**: Ticket holders list their issued tickets for resale directly from their ticket wallet. The system revokes the original QR code upon listing. The listing appears as a post in the community feed.
- **Upvotes on listings**: Authenticated users can upvote a listing to signal interest. Upvote count is displayed on the listing card and influences feed ranking.
- **Public comments on listings**: Buyers can ask questions or leave remarks on a listing. Sellers and other community members can reply, creating a thread per listing.
- **Direct messaging (DM)**: Buyers can initiate a private conversation with a seller directly from the listing, to negotiate or clarify before purchasing.
- **Seller trust score**: Sellers accumulate a trust score based on completed resale history and community interactions, displayed as a badge on their listings.
- **Verified purchase & secure transfer**: Upon successful purchase, the platform revokes the seller's QR and issues a fresh QR to the buyer. The transaction is platform-mediated and fraud-proof.
- **Resale transaction settlement**: Seller receives payout (sale price minus 5% platform fee). Platform collects 5% commission.
- **Resale listing management**: Sellers can cancel their listing before a buyer purchases, restoring their original ticket and QR code.

## Capabilities

### New Capabilities
- `ticket-resale-listing`: Seller-side flow — listing a ticket for resale, price validation (cap at 110% face value), QR code revocation on listing, and cancellation to restore the original ticket.
- `resale-marketplace`: Buyer-side experience — community feed of resale listings, filtering/sorting by event and engagement, verified listing details, and purchasing through the platform.
- `listing-social-interactions`: Upvote/downvote and threaded comment system on resale listings. Community members can engage with listings publicly to signal interest and build trust.
- `resale-direct-messaging`: Private messaging between buyers and sellers initiated from a listing. Conversation threads are scoped per listing and per user pair.
- `resale-transfer`: Backend transfer mechanics — invalidating the seller's ticket, creating a new ticket for the buyer with a fresh QR token hash, recording the resale transaction with fee calculation and seller payout tracking.
- `seller-trust-profile`: Seller reputation system — trust score derived from completed sales, response rate to messages, and community feedback. Displayed as a badge on listings and a public seller profile page.

### Modified Capabilities
- `ticket-purchase`: The checkout flow needs to support a new order source type (resale purchase) alongside direct event purchases, with resale-specific pricing rules (no promotions apply to resale tickets).
- `audience-ticket-wallet`: The wallet UI needs to surface a "Sell My Ticket" action on eligible tickets, show resale listing status, and link to the seller's community activity.

## Impact

- **Database**: New models for `ResaleListing`, `ResaleTransaction`, `ListingUpvote`, `ListingComment`, `DirectMessage`, `DirectMessageThread`, `SellerTrustProfile`. Extensions to `Ticket` model for resale provenance. New `TicketStatus` enum values (`LISTED_FOR_RESALE`, `TRANSFERRED`).
- **API**: New endpoints under `/resale` namespace for listings, purchase, upvotes, comments, and messaging. New `/sellers/:id/profile` endpoint for trust profile. Modifications to ticket and order endpoints for resale context.
- **Worker/Queue**: BullMQ jobs for QR revocation/regeneration, listing auto-expiry, and real-time message delivery notifications.
- **Frontend**: Community feed page, listing detail page with comments/upvotes, DM inbox, seller profile page, "Sell My Ticket" wallet UI.
- **Business rules**: Price cap (max 110% face value), organizer opt-in per event, resale window cutoff (2h before event start), DM moderation (no contact info sharing allowed in messages — enforced by guideline, flagging optional).
- **New dependencies**: Real-time messaging will require WebSocket support (or polling fallback). Notification delivery for DMs and listing activity via existing BullMQ/email infrastructure.
