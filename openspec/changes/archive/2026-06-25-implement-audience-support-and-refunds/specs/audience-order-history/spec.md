## ADDED Requirements

### Requirement: Order detail exposes post-purchase support actions
The system SHALL display support, refund, ticket resend, and order confirmation actions on eligible order detail pages for authenticated audience users.

#### Scenario: Paid order shows support actions
- **WHEN** an authenticated audience user views an owned `PAID` order
- **THEN** the order detail page shows actions to contact support, request refund when eligible, resend tickets, and download order confirmation

#### Scenario: Pending order shows limited support actions
- **WHEN** an authenticated audience user views an owned `PENDING_PAYMENT` order
- **THEN** the order detail page offers payment help or contact support but does not offer ticket resend or paid-order confirmation download

#### Scenario: Refunded order shows final status
- **WHEN** an authenticated audience user views an owned `REFUNDED` order
- **THEN** the order detail page displays refunded status and links to related refund request history when available

### Requirement: Order page displays linked support and refund state
The system SHALL surface active support and refund request summaries on order detail pages.

#### Scenario: Order has active refund request
- **WHEN** an owned order has an active refund request
- **THEN** the order detail page displays the refund request status and links to the refund request detail

#### Scenario: Order has support request
- **WHEN** an owned order has one or more support requests
- **THEN** the order detail page displays recent support request status and links to the support center history

### Requirement: Order confirmation download uses owned order data
The system SHALL provide an order confirmation download action for owned paid orders.

#### Scenario: User downloads confirmation from order detail
- **WHEN** the user clicks download confirmation on an owned paid order
- **THEN** the audience app requests the confirmation contract and renders a printable purchase confirmation

#### Scenario: User downloads another user's confirmation
- **WHEN** a user requests a confirmation for an order they do not own
- **THEN** the backend returns `404`
