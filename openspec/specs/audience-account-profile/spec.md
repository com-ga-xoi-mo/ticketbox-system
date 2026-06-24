# audience-account-profile

## Purpose
TBD: Account landing page displaying user profile information and navigation to orders/tickets.

## Requirements

### Requirement: Account landing page displays user profile
The system SHALL display the authenticated audience user's profile information on the account landing page at `/account`. The profile data SHALL be fetched from `GET /me/profile` and include the user's display name, email address, and role.

#### Scenario: Authenticated user views account page
- **WHEN** an authenticated AUDIENCE user navigates to `/account`
- **THEN** the system displays their display name, email, and a navigation menu to Orders and Tickets sections

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
