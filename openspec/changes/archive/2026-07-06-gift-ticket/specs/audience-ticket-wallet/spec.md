## MODIFIED Requirements

### Requirement: Ticket status displayed with visual indicators

The system SHALL display ticket status using color-coded badges. The status values are: `ISSUED` (green/active), `CHECKED_IN` (blue/info), `VOIDED` (gray/muted), `REFUNDED` (gray/muted), `LISTED_FOR_RESALE` (orange/warning), `TRANSFERRED` (gray/muted), `TRANSFER_PENDING` (amber/warning).

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

#### Scenario: Transfer-pending ticket shows amber badge

- **WHEN** a ticket has status `TRANSFER_PENDING`
- **THEN** the system displays an amber badge with text "Đang tặng" (Pending Gift)
