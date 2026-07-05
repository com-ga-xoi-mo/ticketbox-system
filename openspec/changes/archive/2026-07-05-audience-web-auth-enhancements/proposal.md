## Why

`audience-web` is missing two critical authentication flows: **Forgot Password / Reset Password** (allowing users to recover their account via email) and **Google Sign-In on the registration page**. While the backend already has a `POST /auth/google` endpoint and `GoogleSignInButton.tsx` exists, the Google OAuth flow is not fully integrated into the registration page. The absence of these features creates friction for users and reduces account conversion rates.

## What Changes

- **Forgot Password**: Add a "Forgot Password" page where users can submit their email and receive a password reset link via email.
- **Reset Password**: Add a "Reset Password" page where users can set a new password using a valid token from the reset email.
- **Backend – Forgot Password endpoint**: Create `POST /auth/forgot-password` to accept an email, generate a reset token, and send a reset email.
- **Backend – Reset Password endpoint**: Create `POST /auth/reset-password` to accept a token and new password, validate the token, and update the password.
- **Google Sign-In – full integration**: Integrate `GoogleSignInButton` into `RegisterPage` with proper loading state and error handling; the `LoginPage` already has this.
- **Backend – Google Sign-In**: Confirm `POST /auth/google` correctly handles both cases: new account provisioning and returning user sign-in (already implemented; no changes needed).

## Capabilities

### New Capabilities
- `audience-forgot-password`: Forgot password flow – email input form, backend request, generic success/error messaging.
- `audience-reset-password`: Reset password flow – page reads token from URL, new password form, validation and update.
- `backend-forgot-reset-password`: Backend use cases and endpoints for forgot password and reset password, including email service integration and reset token management.

### Modified Capabilities
- `audience-google-sign-in`: Extend Google Sign-In integration to `RegisterPage`; includes loading state, error handling, and token callback – mirrors the existing `LoginPage` implementation.

## Impact

- **Frontend (`apps/audience-web`)**: Add 2 new pages (`ForgotPasswordPage`, `ResetPasswordPage`), update the router, update `RegisterPage` to include Google Sign-In.
- **Backend (`packages/backend/src/identity`)**: Add 2 new use cases (`ForgotPasswordUseCase`, `ResetPasswordUseCase`), add endpoints to `auth.controller.ts`, add reset token repository, integrate email service.
- **Database**: New `PasswordResetToken` table (token, userId, expiresAt, usedAt).
- **Email Service**: SMTP configuration required to send reset emails (Nodemailer with env-var-based setup).
- **API Types (`@ticketbox/api-types`)**: Add `ForgotPasswordRequest` and `ResetPasswordRequest` schemas.
- **Environment Variables**: New vars for SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) and `FRONTEND_URL` for building reset links.
