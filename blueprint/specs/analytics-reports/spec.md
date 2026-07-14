## ADDED Requirements

### Requirement: Global Reports Data Grid
The system SHALL provide Admins with a detailed, paginated data grid of all concerts, sorted by revenue.

#### Scenario: Admin views reports
- **WHEN** an Admin navigates to `/admin/reports`
- **THEN** they see a table containing Rank, Concert & Organizer, Event Date, Status, Tickets Sold, Check-in Rate, and Total Gross.

### Requirement: Report Filtering and Pagination
The system SHALL allow Admins to search, filter, and paginate the reports grid.

#### Scenario: Admin searches reports
- **WHEN** an Admin types in the search bar
- **THEN** the grid updates to show concerts whose title or organizer name matches the search term, and pagination resets to page 1.

### Requirement: CSV Export
The system SHALL allow Admins to export the current report view to a CSV file.

#### Scenario: Admin exports CSV
- **WHEN** an Admin clicks "Export CSV"
- **THEN** the system fetches up to 5000 matching records and downloads a UTF-8 CSV file containing the report data.
