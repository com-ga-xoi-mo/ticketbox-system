## ADDED Requirements

### Requirement: Bulk check-in staff provisioning
The system SHALL allow an ADMIN to create multiple `CHECKIN_STAFF` accounts for a selected concert in one operation by providing a base email, account quantity, and display name prefix.

#### Scenario: Admin bulk creates check-in staff accounts
- **WHEN** an ADMIN submits a valid bulk check-in staff creation request for a concert
- **THEN** the system SHALL create the requested number of active user accounts with the `CHECKIN_STAFF` role
- **AND** the system SHALL assign each created account to the selected concert with `gateName = null`

#### Scenario: Non-admin attempts bulk creation
- **WHEN** an authenticated user without the `ADMIN` role submits a bulk check-in staff creation request
- **THEN** the system SHALL reject the request with a forbidden error

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
