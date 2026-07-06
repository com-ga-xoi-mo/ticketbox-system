## ADDED Requirements

### Requirement: Audience can set a new password via a reset link
The system SHALL provide a "Reset Password" page at `/reset-password` that reads a `token` query parameter from the URL. The user SHALL be able to enter and confirm a new password. Upon successful submission, the system SHALL call `POST /auth/reset-password` with the token and new password, then redirect the user to `/login`.

#### Scenario: User visits reset link with a valid token
- **WHEN** a user navigates to `/reset-password?token=<valid_token>`
- **THEN** the page SHALL render a form with fields for new password and confirm password, without requiring authentication

#### Scenario: User visits reset password page without a token
- **WHEN** a user navigates to `/reset-password` with no `token` query parameter
- **THEN** the page SHALL display an error message "Liên kết không hợp lệ hoặc đã hết hạn." and SHALL show a link to `/forgot-password` to request a new reset link

#### Scenario: User successfully resets their password
- **WHEN** a user submits a new password and confirm password that match and meet the minimum length requirement (at least 8 characters)
- **THEN** the frontend SHALL call `POST /auth/reset-password` with the token and new password, display a success message, and redirect to `/login` after 2 seconds

#### Scenario: Passwords do not match
- **WHEN** a user submits the form with a new password and a confirm password that do not match
- **THEN** the system SHALL display a client-side validation error "Mật khẩu xác nhận không khớp." and SHALL NOT call the backend API

#### Scenario: New password does not meet minimum length
- **WHEN** a user submits a new password shorter than 8 characters
- **THEN** the system SHALL display a client-side validation error and SHALL NOT call the backend API

#### Scenario: Backend rejects the token (expired or already used)
- **WHEN** the backend returns a 400 or 401 error for the reset request
- **THEN** the frontend SHALL display "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ." and SHALL show a link to `/forgot-password` to request a new one

#### Scenario: Reset email link routes correctly
- **WHEN** a user receives a password reset email containing a link
- **THEN** clicking the link SHALL navigate to `/reset-password?token=<token>` in the audience-web application
