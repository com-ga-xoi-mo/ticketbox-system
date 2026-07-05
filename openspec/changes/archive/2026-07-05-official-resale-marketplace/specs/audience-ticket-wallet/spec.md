## ADDED Requirements

### Requirement: Sell My Ticket action on eligible tickets
The system SHALL display a "Bán lại vé" (Sell My Ticket) button on ticket detail pages for tickets that are eligible for resale. A ticket is eligible when: its status is `ISSUED`, the event has resale enabled, the event start time is more than 2 hours away, and the ticket was not issued via guest-list.

#### Scenario: Eligible ticket shows sell action
- **WHEN** an authenticated user views an `ISSUED` ticket for a resale-enabled event starting more than 2 hours from now
- **THEN** the ticket detail page SHALL display a "Bán lại vé" button

#### Scenario: Non-eligible ticket hides sell action
- **WHEN** a user views a ticket that is `CHECKED_IN`, `VOIDED`, `REFUNDED`, or `TRANSFERRED`, or the event has resale disabled, or the event starts within 2 hours
- **THEN** the ticket detail page SHALL NOT display the "Bán lại vé" button

#### Scenario: Sell action opens listing form
- **WHEN** a user taps "Bán lại vé" on an eligible ticket
- **THEN** the system SHALL display a form showing the original face value, the maximum allowed asking price, and an input for the seller's desired asking price

### Requirement: Listed ticket shows resale status in wallet
The system SHALL display resale listing status on tickets that are currently listed for resale. The ticket card in the My Tickets list and the ticket detail page SHALL show a distinct status indicator for `LISTED_FOR_RESALE` tickets.

#### Scenario: Listed ticket shows resale badge in list
- **WHEN** a user views My Tickets and has a ticket with status `LISTED_FOR_RESALE`
- **THEN** the ticket card SHALL display an orange badge with text "Đang bán lại" (Listed for resale)

#### Scenario: Listed ticket detail shows listing info
- **WHEN** a user views the detail of a `LISTED_FOR_RESALE` ticket
- **THEN** the system SHALL display the asking price, listing date, and a "Hủy bán" (Cancel listing) button instead of the QR code (since QR is voided)

#### Scenario: Listed ticket hides QR code
- **WHEN** a ticket is in `LISTED_FOR_RESALE` status
- **THEN** the ticket detail page SHALL NOT display a QR code; instead, it SHALL show a message indicating the ticket is listed for resale and the QR has been temporarily suspended

### Requirement: Transferred ticket shows transfer status in wallet
The system SHALL display a distinct status for tickets that have been transferred via resale. The seller's transferred ticket SHALL remain visible in their history with appropriate status.

#### Scenario: Transferred ticket shows badge
- **WHEN** a user views My Tickets and has a ticket with status `TRANSFERRED`
- **THEN** the ticket card SHALL display a gray badge with text "Đã chuyển nhượng" (Transferred)

#### Scenario: Transferred ticket detail shows transfer info
- **WHEN** a user views the detail of a `TRANSFERRED` ticket
- **THEN** the system SHALL display the transfer date, the sale price, and payout status; the QR code SHALL NOT be shown

### Requirement: Resale listing management in wallet
The system SHALL provide listing management capabilities within the ticket wallet. Sellers SHALL be able to view their active listings and cancel them directly from the ticket detail page.

#### Scenario: Cancel listing from ticket detail
- **WHEN** a seller taps "Hủy bán" on a listed ticket's detail page
- **THEN** the system SHALL call `DELETE /resale/listings/:id`, restore the ticket to `ISSUED` status, regenerate the QR code, and refresh the ticket detail to show the restored ticket with its new QR

#### Scenario: Listing cancelled confirmation
- **WHEN** a listing is successfully cancelled from the wallet
- **THEN** the system SHALL display a success message indicating the ticket has been restored and a new QR code has been generated

## MODIFIED Requirements

### Requirement: Ticket status displayed with visual indicators
The system SHALL display ticket status using color-coded badges. The status values are: `ISSUED` (green/active), `CHECKED_IN` (blue/info), `VOIDED` (gray/muted), `REFUNDED` (gray/muted), `LISTED_FOR_RESALE` (orange/warning), `TRANSFERRED` (gray/muted).

#### Scenario: Issued ticket shows active badge
- **WHEN** a ticket has status `ISSUED`
- **THEN** the system displays a green badge with text "Hợp lệ" (Valid)

#### Scenario: Checked-in ticket shows info badge
- **WHEN** a ticket has status `CHECKED_IN`
- **THEN** the system displays a blue badge with text "Đã check-in" and the check-in timestamp

#### Scenario: Listed-for-resale ticket shows warning badge
- **WHEN** a ticket has status `LISTED_FOR_RESALE`
- **THEN** the system displays an orange badge with text "Đang bán lại"

#### Scenario: Transferred ticket shows muted badge
- **WHEN** a ticket has status `TRANSFERRED`
- **THEN** the system displays a gray badge with text "Đã chuyển nhượng"

### Requirement: Ticket detail exposes post-purchase support actions
The system SHALL display support, refund, resend, resale, and download actions on ticket detail pages when the authenticated audience user owns the ticket. The available actions SHALL vary based on ticket status.

#### Scenario: Issued ticket shows support actions
- **WHEN** the user views an owned `ISSUED` ticket
- **THEN** the ticket detail page shows actions to contact support, request refund when eligible, resend ticket email, download or print the ticket, and sell the ticket (if resale-eligible)

#### Scenario: Checked-in ticket limits refund action
- **WHEN** the user views an owned `CHECKED_IN` ticket
- **THEN** the ticket detail page keeps support and download actions available but disables refund request unless eligibility rules allow it, and hides the sell action

#### Scenario: Refunded ticket shows refund state
- **WHEN** the user views an owned `REFUNDED` ticket
- **THEN** the ticket detail page displays refunded status and links to related refund request history when available

#### Scenario: Listed ticket shows cancel-listing action
- **WHEN** the user views an owned `LISTED_FOR_RESALE` ticket
- **THEN** the ticket detail page shows a "Hủy bán" (Cancel listing) action and hides refund, resend, download, and sell actions

#### Scenario: Transferred ticket shows read-only state
- **WHEN** the user views an owned `TRANSFERRED` ticket
- **THEN** the ticket detail page shows transfer details and payout status with no actionable buttons except contact support
