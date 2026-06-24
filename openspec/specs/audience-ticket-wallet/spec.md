# audience-ticket-wallet

## Purpose
TBD: My Tickets list and Ticket detail page with QR code rendering optimized for mobile gate entry.

## Requirements

### Requirement: My Tickets page lists all user tickets
The system SHALL display a list of all tickets belonging to the authenticated user at `/account/tickets`. Each ticket item SHALL show the concert name, ticket type, ticket number, status, and event date.

#### Scenario: User with tickets views My Tickets page
- **WHEN** an authenticated AUDIENCE user navigates to `/account/tickets`
- **THEN** the system fetches tickets from `GET /me/tickets` and displays them as a list grouped or sorted by concert date

#### Scenario: User with no tickets views My Tickets page
- **WHEN** an authenticated AUDIENCE user with no tickets navigates to `/account/tickets`
- **THEN** the system displays an empty state message indicating no tickets exist, with a link to browse events

#### Scenario: Tickets loading state
- **WHEN** the tickets data is being fetched
- **THEN** the system displays skeleton card placeholders

### Requirement: Ticket status displayed with visual indicators
The system SHALL display ticket status using color-coded badges. The status values are: `ISSUED` (green/active), `CHECKED_IN` (blue/info), `VOIDED` (gray/muted), `REFUNDED` (gray/muted).

#### Scenario: Issued ticket shows active badge
- **WHEN** a ticket has status `ISSUED`
- **THEN** the system displays a green badge with text "Hợp lệ" (Valid)

#### Scenario: Checked-in ticket shows info badge
- **WHEN** a ticket has status `CHECKED_IN`
- **THEN** the system displays a blue badge with text "Đã check-in" and the check-in timestamp

### Requirement: Ticket detail page shows full ticket information with QR
The system SHALL display a detailed ticket view at `/account/tickets/:id`. The detail page SHALL fetch the ticket from `GET /me/tickets/:id` (which dynamically generates the `qrPayload`) and display: concert name, venue, event date/time, ticket type, seat/zone information, ticket number, status badge, and the QR code rendered from `qrPayload`.

#### Scenario: User views ticket detail
- **WHEN** an authenticated user navigates to `/account/tickets/:id` for a ticket they own
- **THEN** the system fetches ticket data including the dynamically-generated `qrPayload` and renders all ticket information with a prominent QR code

#### Scenario: User views a voided ticket
- **WHEN** a user views the detail of a ticket with status `VOIDED`
- **THEN** the system displays the ticket information with a `VOIDED` badge and the QR code is visually dimmed or overlaid with a "voided" indicator

#### Scenario: User views a checked-in ticket
- **WHEN** a user views the detail of a ticket with status `CHECKED_IN`
- **THEN** the system displays the ticket information with a `CHECKED_IN` badge, the check-in timestamp, and the QR code (still visible but with a checked-in overlay)

### Requirement: QR code rendering from qrPayload
The system SHALL render the `qrPayload` string as a QR code using a client-side SVG-based QR library. The QR code SHALL be rendered at a minimum size of 280px to ensure scannability by venue barcode readers.

#### Scenario: QR code renders from payload
- **WHEN** the ticket detail page loads successfully and `qrPayload` is present
- **THEN** an SVG QR code is rendered from the `qrPayload` string at minimum 280x280px, centered on the page

#### Scenario: QR payload is absent or empty
- **WHEN** the ticket detail response does not include a `qrPayload` (edge case)
- **THEN** the system displays a message indicating the QR code is unavailable and suggests refreshing

### Requirement: Mobile-first wallet card layout
The ticket detail page SHALL be designed as a mobile-first "wallet card" optimized for presenting at venue gates. The layout SHALL prioritize the QR code at the top, followed by essential ticket information, with minimal navigation chrome (back button only).

#### Scenario: Mobile viewport renders wallet layout
- **WHEN** the ticket detail page is viewed on a mobile viewport (< 640px)
- **THEN** the QR code occupies the full width (with padding), concert and ticket info are stacked below, and only a back button is shown for navigation

#### Scenario: Desktop viewport renders wallet layout
- **WHEN** the ticket detail page is viewed on a desktop viewport
- **THEN** the wallet card is centered with a max-width constraint, maintaining the mobile-optimized layout in a card container

### Requirement: Ticket detail encourages screen brightness
The system SHALL display a subtle hint near the QR code area suggesting the user increase screen brightness for better scanning at venue gates.

#### Scenario: Brightness hint displayed
- **WHEN** the ticket detail page renders with a valid QR code
- **THEN** a text hint such as "Tăng độ sáng màn hình để quét dễ hơn" is displayed near the QR code

### Requirement: Tickets API client follows established patterns
The tickets API client SHALL be implemented in `shared/api/tickets.ts` with fetch functions (`fetchMyTickets`, `fetchTicketDetail`), a query key factory (`ticketKeys`), and React Query hooks (`useMyTickets`, `useTicketDetail`).

#### Scenario: Ticket detail query key includes ticket ID
- **WHEN** `useTicketDetail(ticketId)` is called
- **THEN** it uses the query key `['tickets', 'detail', ticketId]` and fetches from `GET /me/tickets/${ticketId}`

#### Scenario: Ticket detail is not cached aggressively
- **WHEN** `useTicketDetail` is configured
- **THEN** the `staleTime` is set to a short duration (e.g., 30 seconds) because `qrPayload` is dynamically generated and should be fresh
