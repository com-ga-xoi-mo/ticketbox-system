## ADDED Requirements

### Requirement: Console users manage their own profile
The console web app SHALL provide a self-account page for authenticated ADMIN and ORGANIZER users that loads and updates only the current user's profile via `/me/profile`.

#### Scenario: Admin opens self-account page
- **WHEN** an authenticated ADMIN navigates to `/admin/account`
- **THEN** the system displays the current admin's avatar, email, roles, and editable profile fields from `GET /me/profile`

#### Scenario: Organizer opens self-account page
- **WHEN** an authenticated ORGANIZER navigates to `/organizer/account`
- **THEN** the system displays the current organizer's avatar, email, roles, and editable profile fields from `GET /me/profile`

#### Scenario: Console user updates profile
- **WHEN** an authenticated console user submits changes to display name, phone, date of birth, gender, address line, city, or district
- **THEN** the system sends `PATCH /me/profile` with only self-editable profile fields
- **AND** the page displays the saved profile after success

### Requirement: Console users manage their own avatar
The console self-account page SHALL allow ADMIN and ORGANIZER users to upload, change, and remove only their own avatar through current-user avatar APIs.

#### Scenario: Console user uploads avatar
- **WHEN** an authenticated console user selects an avatar image and confirms upload
- **THEN** the system sends `POST /me/avatar` as multipart form data using field name `file`
- **AND** the displayed avatar updates after success

#### Scenario: Console user removes avatar
- **WHEN** an authenticated console user chooses to remove their current avatar
- **THEN** the system sends `DELETE /me/avatar`
- **AND** the UI falls back to initials after success

### Requirement: Console users change their own password
The console self-account page SHALL allow ADMIN and ORGANIZER users to change their own password using current password and new password fields. When opened with `section=password`, the page SHALL make the password section the active or focused account section.

#### Scenario: Console user changes password successfully
- **WHEN** an authenticated console user submits a current password and a valid new password
- **THEN** the system sends `PATCH /me/password`
- **AND** the UI confirms success without logging the user out

#### Scenario: Console user enters invalid current password
- **WHEN** `PATCH /me/password` returns an invalid credentials error
- **THEN** the system displays an inline or toast error and leaves the password form editable

#### Scenario: Console user opens password section directly
- **WHEN** an ADMIN or ORGANIZER navigates to their self-account page with `section=password`
- **THEN** the password change section is shown as the active or focused section

### Requirement: Organizer self-account scope
The organizer account page SHALL NOT call admin user-management APIs or expose controls for viewing or editing other users.

#### Scenario: Organizer manages account
- **WHEN** an ORGANIZER uses `/organizer/account`
- **THEN** the frontend calls only `/me/profile`, `/me/avatar`, and `/me/password` for account management actions
- **AND** the page does not render user list, role management, status management, or admin account dialogs

### Requirement: Console account API hooks
The console web app SHALL provide reusable API functions and React Query hooks for current-user profile, avatar, and password operations.

#### Scenario: Self-account hooks are reused by roles
- **WHEN** admin and organizer self-account pages need current-user account operations
- **THEN** they use the same `/me/*` API client and query keys instead of duplicating endpoint calls
