## ADDED Requirements

### Requirement: Audience can request a password reset link via email
The system SHALL provide a "Forgot Password" page at `/forgot-password` where an unauthenticated audience user can submit their email address. The system SHALL call `POST /auth/forgot-password` and display a generic success message regardless of whether the email is registered, to prevent user enumeration.

#### Scenario: User submits a registered email
- **WHEN** a user navigates to `/forgot-password`, enters a valid email address, and submits the form
- **THEN** the frontend SHALL send `POST /auth/forgot-password` with the email, display a success message "Nếu email của bạn đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.", and disable further submissions until the user navigates away or the form resets

#### Scenario: User submits an unregistered email
- **WHEN** a user submits an email that is not associated with any account
- **THEN** the frontend SHALL display the same generic success message as for a registered email, and SHALL NOT indicate that the email was not found

#### Scenario: User submits an empty or invalid email format
- **WHEN** a user submits the form with an empty or malformed email address
- **THEN** the system SHALL display a client-side validation error and SHALL NOT call the backend API

#### Scenario: Forgot password page is accessible without authentication
- **WHEN** an unauthenticated user navigates to `/forgot-password`
- **THEN** the page SHALL render without requiring login, and SHALL include a link back to `/login`

#### Scenario: Login page links to forgot password
- **WHEN** a user views the `/login` page
- **THEN** there SHALL be a visible "Quên mật khẩu?" link that navigates to `/forgot-password`

#### Scenario: API call fails due to network or server error
- **WHEN** the `POST /auth/forgot-password` call returns a 5xx error or network failure
- **THEN** the frontend SHALL display a user-friendly error message and allow the user to retry
