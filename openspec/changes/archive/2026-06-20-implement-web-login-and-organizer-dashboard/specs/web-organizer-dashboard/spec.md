## ADDED Requirements

### Requirement: Organizer overview stat cards

The organizer dashboard SHALL present overview stat cards rendered from a reusable stat-card component. This change sources card values from mock data; the cards MUST be structured so values can later come from a role-scoped API without changing the component.

#### Scenario: Stat cards rendered

- **WHEN** an organizer opens `/dashboard`
- **THEN** the dashboard shows stat cards for total concerts (with trend), published/drafts split, tickets available over total, and sold-out rate

#### Scenario: Reusable card shape

- **WHEN** a stat card is rendered
- **THEN** it displays a label, a value, and an optional trend indicator from its props alone

### Requirement: Concert-status donut and recent-concerts table

The dashboard SHALL display a concert-status donut breakdown and a recent-concerts table with columns Name, Date, Venue, Status, and Actions, populated from mock data this change.

#### Scenario: Status donut shown

- **WHEN** the dashboard renders
- **THEN** a donut visualization of concert statuses is shown

#### Scenario: Recent concerts table shown

- **WHEN** the dashboard renders
- **THEN** a table lists recent concerts with Name, Date, Venue, Status, and an Actions control per row

### Requirement: Organizer-only Quick Actions

The dashboard SHALL show Quick Actions — Create Concert, Upload Map, and Add Ticket Type — to organizers. In this change these are navigation controls only; their destination pages are out of scope.

#### Scenario: Quick Actions visible to organizer

- **WHEN** an organizer views the dashboard
- **THEN** Quick Actions for Create Concert, Upload Map, and Add Ticket Type are shown

#### Scenario: Quick Actions navigate only

- **WHEN** an organizer activates a Quick Action
- **THEN** the app performs a navigation intent without requiring the destination page to exist yet
