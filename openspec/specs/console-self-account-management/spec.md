# Console Self Account Management

## Purpose
Define how authenticated admin and organizer console users manage their own profile, avatar, and password without accessing another user's account controls.

## Requirements

### Requirement: Console users manage their own profile
The console web app SHALL provide a self-account page for authenticated ADMIN and ORGANIZER users that loads and updates only the current user's profile via `/me/profile`.

#### Scenario: Admin opens self-account page
- **WHEN** an authenticated ADMIN user opens `/admin/account`
- **THEN** the page loads the current user's profile from `GET /me/profile`
- **AND** the page shows editable profile fields for the current user only

#### Scenario: Organizer opens self-account page
- **WHEN** an authenticated ORGANIZER user opens `/organizer/account`
- **THEN** the page loads the current user's profile from `GET /me/profile`
- **AND** the page shows editable profile fields for the current user only

#### Scenario: Console user updates profile
- **WHEN** a console user edits supported profile fields and submits the form
- **THEN** the system sends `PATCH /me/profile`
- **AND** the page displays the saved profile after success

### Requirement: Console users manage their own avatar
The console self-account page SHALL allow authenticated ADMIN and ORGANIZER users to upload, change, and remove their own avatar through current-user avatar APIs.

#### Scenario: Console user uploads avatar
- **WHEN** a console user selects an avatar image file
- **THEN** the system sends the file as multipart form data field `file` to `POST /me/avatar`
- **AND** the top navbar and account page use the returned avatar URL after success

#### Scenario: Console user removes avatar
- **WHEN** a console user removes their avatar
- **THEN** the system sends `DELETE /me/avatar`
- **AND** the top navbar and account page fall back to initials after success

### Requirement: Console users change their own password
The console self-account page SHALL allow authenticated ADMIN and ORGANIZER users to change their own password through `PATCH /me/password`.

#### Scenario: Console user changes password successfully
- **WHEN** a console user enters their current password and a valid new password
- **THEN** the system sends `PATCH /me/password`
- **AND** the page displays a success confirmation without exposing password values

#### Scenario: Console user enters invalid current password
- **WHEN** the password change request fails because the current password is incorrect
- **THEN** the page displays an actionable error message and keeps the password section open

#### Scenario: Console user opens direct password section
- **WHEN** a console user opens their account page with `section=password`
- **THEN** the password change section is active and focused

### Requirement: Organizer self-account scope
The organizer self-account experience SHALL be limited to the current organizer user's own account and SHALL NOT expose admin user-management controls.

#### Scenario: Organizer self-account uses current-user APIs
- **WHEN** an ORGANIZER user manages their own account
- **THEN** the page calls only `/me/profile`, `/me/avatar`, and `/me/password` endpoints for account changes
- **AND** the page does not expose role assignment, status changes, or other-user editing controls

### Requirement: Console account API hooks
The console web app SHALL provide reusable API functions and React Query hooks for current-user profile, avatar, and password operations.

#### Scenario: Console account hooks validate responses
- **WHEN** a console account API call returns profile or avatar data
- **THEN** the client validates the response with shared API-type schemas before updating UI state
