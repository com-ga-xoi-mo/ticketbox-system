## ADDED Requirements

### Requirement: Audience register page offers Google sign-in as an alternative to email registration
The audience `/register` page SHALL include the same official Google Identity Services control as the login page, allowing users to create an account or sign in via Google directly from the registration flow. The control SHALL use the same backend endpoint `POST /auth/google` and the same `AuthContext.signIn` integration.

#### Scenario: Google sign-in from register page provisions a new account
- **WHEN** a user on the `/register` page clicks the Google sign-in control and Google returns a credential for an email not yet registered in TicketBox
- **THEN** the frontend SHALL call `POST /auth/google`, the backend SHALL atomically provision a new `AUDIENCE` account, and the frontend SHALL call `AuthContext.signIn` and navigate to `/` or the intended destination

#### Scenario: Google sign-in from register page signs in an existing account
- **WHEN** a user on the `/register` page uses Google sign-in with a credential whose Google subject is already linked to a TicketBox account
- **THEN** the frontend SHALL call `POST /auth/google`, receive a valid access token, call `AuthContext.signIn`, and navigate to `/`, behaving identically to signing in from the login page

#### Scenario: Account-link-required error on register page is actionable
- **WHEN** the backend returns `ACCOUNT_LINK_REQUIRED` in response to Google sign-in on the register page
- **THEN** the page SHALL keep the user signed out and display a message directing them to log in using their existing email and password at `/login`

#### Scenario: Google sign-in failure on register page is safe
- **WHEN** Google sign-in on the register page returns a `401` error
- **THEN** the page SHALL display a generic error message without exposing raw backend or provider details, and the email/password registration form SHALL remain usable

#### Scenario: Missing Google configuration does not break email registration
- **WHEN** the Google client ID is absent or the Google client script cannot load on the register page
- **THEN** the Google control SHALL be hidden or shown in a disabled state, while the email/password registration form remains fully functional
