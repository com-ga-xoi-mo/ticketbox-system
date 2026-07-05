## ADDED Requirements

### Requirement: Admin accounts table displays expanded profile fields
The admin web accounts page SHALL display avatar, display name, email, phone, roles, and status for user accounts returned by `/admin/users`.

#### Scenario: Admin views accounts list
- **WHEN** an ADMIN opens `/admin/accounts`
- **THEN** the accounts table displays each account's avatar or initials, display name, email, phone, roles, and status

#### Scenario: Admin searches by phone
- **WHEN** an ADMIN enters a search term matching an account phone number
- **THEN** the accounts list includes matching accounts in the filtered result

### Requirement: Admin creates account with profile fields
The admin create-account dialog SHALL allow an ADMIN to provide supported profile fields when creating a user account.

#### Scenario: Admin creates account with optional profile data
- **WHEN** an ADMIN submits a new account with display name, email, password, role, and optional phone, date of birth, gender, address line, city, or district
- **THEN** the frontend sends those values to `POST /admin/users`
- **AND** the accounts list refreshes after success

### Requirement: Admin edits account profile fields
The admin edit-account dialog SHALL allow an ADMIN to update supported profile fields while preserving role editing.

#### Scenario: Admin edits profile and role
- **WHEN** an ADMIN changes display name, email, roles, phone, date of birth, gender, address line, city, or district
- **THEN** the frontend sends the supported values to `PATCH /admin/users/:id`
- **AND** the account list and account detail cache refresh after success

### Requirement: Admin account management does not upload user avatars
The admin account management UI SHALL display user avatars when provided by the API but SHALL NOT provide avatar upload/removal controls for other users.

#### Scenario: Admin edits another account
- **WHEN** an ADMIN opens the create or edit account dialog
- **THEN** the dialog does not render avatar upload or avatar removal controls
