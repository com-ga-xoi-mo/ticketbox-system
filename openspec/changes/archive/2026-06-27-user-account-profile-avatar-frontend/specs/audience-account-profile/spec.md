## MODIFIED Requirements

### Requirement: Account landing page displays user profile
The system SHALL display and manage the authenticated audience user's profile information on the account landing page at `/account`. The profile data SHALL be fetched from `GET /me/profile` and include the user's display name, email address, role, phone, date of birth, gender, address line, city, district, avatar asset id, and avatar URL.

#### Scenario: Authenticated user views account page
- **WHEN** an authenticated AUDIENCE user navigates to `/account`
- **THEN** the system displays their avatar, display name, email, profile fields, and navigation cards for orders, tickets, support, notifications, and favorites

#### Scenario: Unauthenticated user attempts to access account
- **WHEN** an unauthenticated user navigates to `/account`
- **THEN** the system redirects them to `/login` with a return URL parameter

#### Scenario: Profile data loading state
- **WHEN** the profile data is being fetched from the API
- **THEN** the system displays skeleton placeholders for the profile fields

#### Scenario: Profile fetch fails
- **WHEN** the `GET /me/profile` request fails with a network or server error
- **THEN** the system displays an error message with a retry option

## ADDED Requirements

### Requirement: Audience profile editing
The audience account page SHALL allow the authenticated audience user to update self-editable profile fields.

#### Scenario: Audience user updates profile
- **WHEN** the user submits display name, phone, date of birth, gender, address line, city, or district changes
- **THEN** the system sends `PATCH /me/profile`
- **AND** refreshes the displayed profile after success

#### Scenario: Audience user submits invalid profile data
- **WHEN** the profile update API rejects the submitted values
- **THEN** the system displays the validation or server error without discarding the user's entered values

### Requirement: Audience avatar management
The audience account page SHALL allow the authenticated audience user to upload, change, and remove their own avatar.

#### Scenario: Audience user uploads avatar
- **WHEN** the user selects an image file and submits the avatar form
- **THEN** the system sends `POST /me/avatar` as multipart form data using field name `file`
- **AND** refreshes the account profile after success

#### Scenario: Audience user removes avatar
- **WHEN** the user chooses to remove their avatar
- **THEN** the system sends `DELETE /me/avatar`
- **AND** the page and header fallback to initials after success

### Requirement: Audience password change
The audience account page SHALL allow the authenticated audience user to change their own password using current password and new password fields.

#### Scenario: Audience user changes password
- **WHEN** the user submits a current password and valid new password
- **THEN** the system sends `PATCH /me/password`
- **AND** shows a success confirmation after the request succeeds

#### Scenario: Audience user enters wrong current password
- **WHEN** `PATCH /me/password` fails because the current password is invalid
- **THEN** the system shows an error and keeps the user on the account page

### Requirement: Audience header uses profile avatar
The audience header account dropdown SHALL render the authenticated user's avatar URL from `/me/profile` when available.

#### Scenario: Header profile has avatar
- **WHEN** the authenticated user's profile includes `avatarUrl`
- **THEN** the header dropdown avatar image uses that URL

#### Scenario: Header profile has no avatar
- **WHEN** the authenticated user's profile has no avatar URL
- **THEN** the header dropdown displays initials derived from the user's display name
