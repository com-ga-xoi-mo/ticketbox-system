## ADDED Requirements

### Requirement: Admin Operational Overview
The system SHALL provide Admins with an overview dashboard that aggregates metrics across all events.

#### Scenario: Admin views dashboard
- **WHEN** an Admin navigates to `/admin/dashboard`
- **THEN** they see Platform Total Gross, Active Events, Total Users, a Revenue Trend bar chart, Top Grossing Concerts table, and an Upcoming Concerts timeline.

### Requirement: Organizer Operational Overview
The system SHALL provide Organizers with an overview dashboard that aggregates metrics for only their own events.

#### Scenario: Organizer views dashboard
- **WHEN** an Organizer navigates to `/organizer/dashboard`
- **THEN** they see Total Revenue, Check-in Rate, Tickets Sold, a Sales Velocity area chart, My Active Concerts table, and Live Check-in Status.
- **THEN** the data MUST NOT include metrics from events created by other Organizers.

### Requirement: Dynamic Time Window Filtering
The system SHALL allow users to filter dashboard analytics by time window.

#### Scenario: User changes time window
- **WHEN** the user selects a new time window (e.g., "Last 7 Days") from the dropdown
- **THEN** the revenue charts and metrics MUST update to reflect the selected period.
