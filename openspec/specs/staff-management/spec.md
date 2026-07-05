# Staff Management Specification

## Purpose
Define staff-management behavior for admin-operated check-in staff account lists, bulk staff provisioning, generated credential handling, and assignment-related workflows.

## Requirements

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

### Requirement: Bulk staff email generation and validation
The system SHALL generate bulk staff account emails from the submitted base email using numeric suffixing and SHALL validate the complete generated batch before creating any account.

#### Scenario: Emails are generated from a base email
- **WHEN** an ADMIN submits base email `abc@gmail.com` with quantity `3`
- **THEN** the system SHALL generate `abc@gmail.com`, `abc1@gmail.com`, and `abc2@gmail.com`

#### Scenario: Generated email already exists
- **WHEN** any generated email already belongs to an existing user
- **THEN** the system SHALL reject the whole request before creating accounts or assignments

### Requirement: One-time credential response
The system SHALL generate a distinct login password for each bulk-created account, persist only password hashes, and return the raw generated passwords only in the successful bulk creation response.

#### Scenario: Bulk creation returns generated credentials
- **WHEN** bulk check-in staff creation succeeds
- **THEN** the response SHALL include each created account's `displayName`, `email`, raw generated `password`, `assignmentId`, and `concertTitle`

#### Scenario: Credentials are not retrievable later
- **WHEN** the admin refreshes the page or later reloads staff assignments
- **THEN** the system SHALL NOT provide the raw generated passwords again

### Requirement: Bulk staff credential display
The admin web SHALL display the newly generated credentials immediately after successful bulk creation and SHALL not persist raw credentials beyond the immediate result state.

#### Scenario: Admin views generated credentials
- **WHEN** bulk check-in staff creation succeeds
- **THEN** the admin web SHALL display a credentials table containing display name, email, and account password for each created account

#### Scenario: Admin starts a new bulk creation flow
- **WHEN** the admin starts another bulk creation or leaves the staff assignment page
- **THEN** the admin web SHALL clear the previous raw credentials from the page state

### Requirement: Password-protected credential PDF export
The admin web SHALL allow the ADMIN to download a password-protected PDF containing the generated check-in staff credentials only after the admin enters a PDF open password.

#### Scenario: Admin downloads a protected credential PDF
- **WHEN** generated credentials are visible and the admin enters a PDF open password
- **THEN** the admin web SHALL generate a PDF that requires that password to open
- **AND** the PDF SHALL include the concert title, creation date, security note, and a table with sequence number, display name, email, and account password

#### Scenario: Admin attempts PDF download without PDF password
- **WHEN** generated credentials are visible but the admin has not entered a PDF open password
- **THEN** the admin web SHALL prevent PDF download and prompt for the PDF password

#### Scenario: PDF protection is unavailable
- **WHEN** the configured PDF generation library cannot produce a password-protected PDF
- **THEN** the admin web SHALL NOT produce an unprotected credential PDF

### Requirement: Admin accounts table displays expanded profile fields
The admin web accounts page SHALL display avatar, display name, email, phone, roles, and status for user accounts returned by `/admin/users`.

#### Scenario: Admin views account rows
- **WHEN** an ADMIN opens the accounts page
- **THEN** each account row displays the user's avatar or initials, display name, email, phone, roles, and status

#### Scenario: Admin searches accounts by phone
- **WHEN** an ADMIN searches with a phone number fragment
- **THEN** the accounts list filters users whose phone matches the search query

### Requirement: Admin creates account with profile fields
The admin create-account dialog SHALL allow entering supported profile fields for manually created user accounts.

#### Scenario: Admin creates account with profile details
- **WHEN** an ADMIN submits the create-account form with optional phone, date of birth, gender, address line, city, and district
- **THEN** the system sends those profile fields to `POST /admin/users`
- **AND** the accounts list refreshes after success

### Requirement: Admin edits account profile fields
The admin edit-account dialog SHALL allow editing supported profile fields while preserving role editing controls.

#### Scenario: Admin edits profile details
- **WHEN** an ADMIN submits changes for display name, email, roles, phone, date of birth, gender, address line, city, and district
- **THEN** the system sends the edited fields to `PATCH /admin/users/:id`
- **AND** the accounts list and detail cache refresh after success

### Requirement: Admin account management does not upload user avatars
The admin account management UI SHALL display account avatars but SHALL NOT provide upload or removal controls for other users' avatars.

#### Scenario: Admin opens create or edit account dialog
- **WHEN** an ADMIN creates or edits another user account
- **THEN** the dialog does not include avatar upload or avatar removal controls
