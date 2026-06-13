## ADDED Requirements

### Requirement: User authentication
The system SHALL allow users to register, log in, and maintain an authenticated session for protected actions.

#### Scenario: Audience logs in successfully
- **WHEN** a registered audience user submits valid credentials
- **THEN** the system SHALL create an authenticated session or token that can be used for checkout and viewing owned tickets

#### Scenario: Invalid login is rejected
- **WHEN** a user submits invalid credentials
- **THEN** the system SHALL reject the login without revealing whether the email exists

### Requirement: Role-based access control
The system SHALL enforce role-based access control for audience, organizer, check-in staff, and admin users.

#### Scenario: Audience is blocked from admin concert creation
- **WHEN** an audience user calls an admin concert creation endpoint
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Organizer manages own concerts
- **WHEN** an organizer updates a concert they own
- **THEN** the system SHALL allow the update if the requested fields are valid

### Requirement: Check-in staff authorization
The system SHALL restrict check-in operations to check-in staff assigned to the relevant concert or gate.

#### Scenario: Staff scans assigned concert ticket
- **WHEN** a check-in staff user scans a valid ticket for an assigned concert
- **THEN** the system SHALL evaluate the ticket and record the check-in result

#### Scenario: Staff scans unassigned concert ticket
- **WHEN** a check-in staff user scans a ticket for a concert they are not assigned to
- **THEN** the system SHALL reject the check-in request

