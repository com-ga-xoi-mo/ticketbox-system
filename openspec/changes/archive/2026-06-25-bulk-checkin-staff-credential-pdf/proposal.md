## Why

Admins currently need to create check-in staff accounts and assign them to concerts one by one, which is slow and error-prone for events that need many temporary staff. They also need a secure handoff format for organizer-facing credentials without storing raw passwords for later retrieval.

## What Changes

- Add a bulk check-in staff provisioning flow from the admin staff assignment page.
- Allow admins to enter a base email, account quantity, and display name prefix for the selected concert.
- Generate check-in staff account emails from the base email using numeric suffixing, for example `abc@gmail.com`, `abc1@gmail.com`, `abc2@gmail.com`.
- Generate a distinct login password for each created account, assign each account the `CHECKIN_STAFF` role, and assign each account to the selected concert with `gateName = null`.
- Return generated credentials only in the bulk creation response and do not store raw passwords for later download.
- Allow admins to download a password-protected PDF containing the newly generated credentials after entering a PDF open password.

## Capabilities

### New Capabilities

<!-- No new capability introduced. -->

### Modified Capabilities

- `staff-management`: Adds bulk check-in staff account provisioning, concert-wide assignment, one-time credential handoff, and password-protected PDF export requirements.

## Impact

- Backend identity/staff assignment API: new admin-only bulk creation endpoint under the selected concert staff assignment route.
- Backend application layer: account creation, generated password hashing, preflight email collision validation, and assignment creation must run as one logical batch.
- Admin web: staff assignment page gains bulk create UI, email preview, credentials result table, and protected PDF download.
- Dependencies: frontend PDF generation must use a library that supports PDF encryption/password protection; a non-protected PDF implementation is not acceptable.
