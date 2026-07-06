## ADDED Requirements

### Requirement: Backend exposes a forgot password endpoint
The system SHALL expose `POST /auth/forgot-password` accepting a request body with a single `email` field. The system SHALL always return `200 OK` regardless of whether the email matches an existing user account (to prevent user enumeration). When the email matches an active user account, the system SHALL generate a cryptographically random single-use reset token, persist it with a 1-hour TTL, and send a reset email containing the reset link to that email address.

#### Scenario: Registered email triggers token generation and email delivery
- **WHEN** `POST /auth/forgot-password` is called with an email that matches an active `AUDIENCE` user account
- **THEN** the system SHALL generate a 64-character hex reset token (from 32 random bytes), store it in `PasswordResetToken` with `expiresAt = now() + 1 hour` and `usedAt = null`, send an email to that address containing a link in the format `<FRONTEND_URL>/reset-password?token=<token>`, and return `200 OK` with body `{ "message": "If your email is registered, you will receive a reset link." }`

#### Scenario: Unregistered email returns same 200 response
- **WHEN** `POST /auth/forgot-password` is called with an email that does not match any user
- **THEN** the system SHALL return `200 OK` with the same body and SHALL NOT send any email or create any token

#### Scenario: Invalid email format is rejected
- **WHEN** `POST /auth/forgot-password` is called with a missing or malformed email field
- **THEN** the system SHALL return `400 Bad Request` with validation error details

#### Scenario: Email sending failure does not leak information
- **WHEN** the email service fails to deliver the reset email (SMTP error, network timeout)
- **THEN** the system SHALL log the error internally and SHALL still return `200 OK` to the client, without revealing the delivery failure

---

### Requirement: Backend exposes a reset password endpoint
The system SHALL expose `POST /auth/reset-password` accepting `token` (string) and `newPassword` (string, minimum 8 characters). The system SHALL validate the token against the `PasswordResetToken` table, ensure it has not expired and has not been used, update the linked user's password hash, and mark the token as used.

#### Scenario: Valid token with valid new password resets the password
- **WHEN** `POST /auth/reset-password` is called with a token that exists, has `usedAt = null`, and has `expiresAt > now()`, and `newPassword` meets minimum length
- **THEN** the system SHALL hash the new password using the existing `PasswordHasher` port, update the user's `passwordHash` in the database, set `usedAt = now()` on the `PasswordResetToken` record, and return `200 OK` with `{ "message": "Password reset successfully." }`

#### Scenario: Expired token is rejected
- **WHEN** `POST /auth/reset-password` is called with a token whose `expiresAt` is in the past
- **THEN** the system SHALL return `400 Bad Request` with `{ "code": "TOKEN_EXPIRED", "message": "Reset token has expired." }` and SHALL NOT update the password

#### Scenario: Already-used token is rejected
- **WHEN** `POST /auth/reset-password` is called with a token whose `usedAt` is not null
- **THEN** the system SHALL return `400 Bad Request` with `{ "code": "TOKEN_ALREADY_USED", "message": "Reset token has already been used." }` and SHALL NOT update the password

#### Scenario: Non-existent token is rejected
- **WHEN** `POST /auth/reset-password` is called with a token string that does not exist in the database
- **THEN** the system SHALL return `400 Bad Request` with a generic invalid token error and SHALL NOT reveal whether the token ever existed

#### Scenario: New password fails validation
- **WHEN** `POST /auth/reset-password` is called with a valid token but `newPassword` shorter than 8 characters or missing
- **THEN** the system SHALL return `400 Bad Request` with validation error details and SHALL NOT consume the token

---

### Requirement: PasswordResetToken persistence and lifecycle
The system SHALL maintain a `PasswordResetToken` table in the database with fields: `id` (cuid primary key), `token` (unique string), `userId` (foreign key to User with cascade delete), `expiresAt` (datetime), `usedAt` (nullable datetime), `createdAt` (datetime, auto). The system SHALL ensure each token is single-use and that cascade delete removes tokens when the associated user is deleted.

#### Scenario: Token is created with correct TTL
- **WHEN** a forgot password request is processed for a valid user
- **THEN** a new `PasswordResetToken` record SHALL be created with `expiresAt` exactly 1 hour after creation time and `usedAt = null`

#### Scenario: User deletion cascades to reset tokens
- **WHEN** a user account is deleted from the database
- **THEN** all associated `PasswordResetToken` records for that user SHALL be automatically deleted via cascade

---

### Requirement: Email service integration via port abstraction
The system SHALL define an `EmailSenderPort` interface in the identity domain and provide a Nodemailer-based adapter implementation. The adapter SHALL be configurable via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). The reset email SHALL contain the subject "Đặt lại mật khẩu TicketBox", a reset link, and a note that the link expires in 1 hour.

#### Scenario: Reset email contains required content
- **WHEN** a reset email is sent
- **THEN** it SHALL be sent from the configured `SMTP_FROM` address, contain the subject "Đặt lại mật khẩu TicketBox", include the full reset URL `<FRONTEND_URL>/reset-password?token=<token>`, and include a notice that the link expires in 1 hour

#### Scenario: Email adapter uses environment configuration
- **WHEN** the application starts
- **THEN** the Nodemailer adapter SHALL read `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` from environment variables, and SHALL fail to start if required variables are missing
