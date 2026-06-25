## ADDED Requirements

### Requirement: Staff Accounts Table Pagination
The system SHALL paginate the staff accounts list to improve performance and usability.

#### Scenario: Admin views many staff accounts
- **WHEN** there are more staff accounts than the page limit
- **THEN** pagination controls are displayed at the bottom of the table.

### Requirement: Staff Accounts Hover Actions
The system SHALL provide quick actions (Edit, Change Status) on hover for each staff account row.

#### Scenario: Admin hovers over a staff row
- **WHEN** an Admin hovers over a row in the staff accounts table
- **THEN** quick action buttons appear, replacing the previous 3-dot menu.
