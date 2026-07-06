## MODIFIED Requirements

### Requirement: Bulk check-in staff provisioning
The system SHALL allow an ADMIN to create multiple `CHECKIN_STAFF` accounts for a selected concert in one operation by providing a base email, account quantity, and display name prefix. Bulk-created staff accounts SHALL NOT require phone, date of birth, gender, address, city, district, or avatar data.

#### Scenario: Admin bulk creates check-in staff accounts
- **WHEN** an ADMIN submits a valid bulk check-in staff creation request for a concert
- **THEN** the system SHALL create the requested number of active user accounts with the `CHECKIN_STAFF` role
- **AND** the system SHALL assign each created account to the selected concert with `gateName = null`

#### Scenario: Non-admin attempts bulk creation
- **WHEN** an authenticated user without the `ADMIN` role submits a bulk check-in staff creation request
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Bulk-created staff profile fields default to null
- **WHEN** bulk check-in staff creation succeeds after the user profile schema is expanded
- **THEN** each created staff account SHALL have nullable profile fields and no avatar by default

