# audience-account-profile

## Purpose
TBD: Account landing page displaying user profile information and navigation to orders/tickets.

## Requirements

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

### Requirement: Account navigation provides access to orders and tickets
The system SHALL provide navigation from the account landing page to the My Orders and My Tickets sections. Navigation SHALL use tab-style links or summary cards.

#### Scenario: User navigates to orders from account page
- **WHEN** the user clicks the "My Orders" navigation element on the account page
- **THEN** the system navigates to `/account/orders`

#### Scenario: User navigates to tickets from account page
- **WHEN** the user clicks the "My Tickets" navigation element on the account page
- **THEN** the system navigates to `/account/tickets`

### Requirement: Account routes are protected for AUDIENCE role
All routes under `/account/*` SHALL be wrapped with `AudienceProtectedRoute` to enforce authentication and AUDIENCE role authorization.

#### Scenario: Non-audience role attempts account access
- **WHEN** a user authenticated with a non-AUDIENCE role (e.g., ORGANIZER) navigates to `/account`
- **THEN** the system redirects them to `/access-denied`

### Requirement: Profile API client follows established patterns
The profile API client SHALL be implemented in `shared/api/profile.ts` following the same pattern as `catalog.ts`: a fetch function using `apiGet`, Zod schema validation, a query key factory, and a React Query hook.

#### Scenario: Profile fetch function validates response
- **WHEN** `fetchMyProfile()` receives a response from `GET /me/profile`
- **THEN** the response is validated against the profile Zod schema before being returned

### Requirement: Audience profile editing
The audience account page SHALL allow an authenticated AUDIENCE user to edit their own profile fields supported by `PATCH /me/profile`, including display name, phone, date of birth, gender, address line, city, and district.

#### Scenario: Audience user saves profile changes
- **WHEN** an authenticated AUDIENCE user edits profile fields and submits the account form
- **THEN** the system sends `PATCH /me/profile` with the edited fields
- **AND** the page refreshes the profile data after a successful response

#### Scenario: Audience user submits invalid profile data
- **WHEN** the profile update request fails validation
- **THEN** the system displays the validation error and preserves the entered values for correction

### Requirement: Audience avatar management
The audience account page SHALL allow an authenticated AUDIENCE user to upload, change, and remove their own avatar using the current-user avatar APIs.

#### Scenario: Audience user uploads avatar
- **WHEN** an authenticated AUDIENCE user selects an image file for their avatar
- **THEN** the system sends the file as multipart form data field `file` to `POST /me/avatar`
- **AND** the account page and header use the returned avatar URL after success

#### Scenario: Audience user removes avatar
- **WHEN** an authenticated AUDIENCE user chooses to remove their avatar
- **THEN** the system sends `DELETE /me/avatar`
- **AND** the account page and header fall back to initials after success

### Requirement: Audience password change
The audience account page SHALL allow an authenticated AUDIENCE user to change their own password through `PATCH /me/password`.

#### Scenario: Audience user changes password successfully
- **WHEN** an authenticated AUDIENCE user submits their current password and a valid new password
- **THEN** the system sends `PATCH /me/password`
- **AND** the page displays a success confirmation without exposing password values

#### Scenario: Audience user enters wrong current password
- **WHEN** the password change request fails because the current password is incorrect
- **THEN** the system displays an actionable error message and keeps the password section open

### Requirement: Audience header uses profile avatar
The audience header SHALL render the authenticated user's profile identity from the current profile data, including avatar URL when available.

#### Scenario: Audience header has avatar URL
- **WHEN** the authenticated audience profile includes `avatarUrl`
- **THEN** the header avatar displays that image

#### Scenario: Audience header has no avatar URL
- **WHEN** the authenticated audience profile has no avatar URL
- **THEN** the header avatar displays initials derived from the user's display name or email
