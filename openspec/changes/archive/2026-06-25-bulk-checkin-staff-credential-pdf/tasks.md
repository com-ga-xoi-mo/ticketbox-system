## 1. Backend Bulk Provisioning

- [x] 1.1 Add bulk create request/response DTOs for `POST /admin/concerts/:concertId/staff/bulk-create`.
- [x] 1.2 Implement email generation from base email using numeric suffixing and validate quantity, display name prefix, and duplicate generated emails.
- [x] 1.3 Add repository support to preflight existing users by generated email list.
- [x] 1.4 Implement a bulk check-in staff provisioning use case that authorizes ADMIN, generates secure passwords, hashes them, creates `CHECKIN_STAFF` users, and creates concert-wide assignments with `gateName = null`.
- [x] 1.5 Ensure the bulk operation rejects the whole request before writes when any generated email already exists.
- [x] 1.6 Register the use case and expose the new admin-only controller route.

## 2. Backend Tests

- [x] 2.1 Add unit tests for email generation and validation, including `abc@gmail.com`, `abc1@gmail.com`, and `abc2@gmail.com`.
- [x] 2.2 Add use case tests for successful account creation, generated password hashing, `CHECKIN_STAFF` role assignment, and concert-wide assignment creation.
- [x] 2.3 Add tests proving raw passwords are returned only in the bulk creation response and are not available from assignment/account list responses.
- [x] 2.4 Add controller or e2e coverage for ADMIN-only access and non-admin forbidden behavior.
- [x] 2.5 Add failure tests for existing generated emails and verify no partial users or assignments are created.

## 3. Admin Web Bulk Create UI

- [x] 3.1 Add admin web API client and mutation hook for the bulk create endpoint.
- [x] 3.2 Add a Bulk Create Staff panel to the Staff Assignment page with base email, quantity, and display name prefix inputs.
- [x] 3.3 Show a generated email preview before submission.
- [x] 3.4 Display the one-time credentials table after successful bulk creation.
- [x] 3.5 Clear raw credentials when starting another bulk create flow or leaving the Staff Assignment page.
- [x] 3.6 Invalidate staff assignment and admin account queries after successful bulk creation.

## 4. Password-Protected PDF Export

- [x] 4.1 Add a frontend PDF dependency that supports encryption/password-protected open behavior.
- [x] 4.2 Implement credential PDF generation with concert title, creation date, security note, and sequence/display name/email/account password table.
- [x] 4.3 Add a PDF open password input and disable download until a password is provided.
- [x] 4.4 Prevent fallback to unprotected PDF generation when encryption support is unavailable.
- [x] 4.5 Verify the generated PDF requires the admin-entered password to open.

## 5. Verification

- [x] 5.1 Run backend tests covering identity/staff assignment changes.
- [x] 5.2 Run admin web typecheck and tests.
- [x] 5.3 Run OpenSpec validation/status checks for this change.
- [x] 5.4 Manually verify the admin flow: select concert, preview emails, bulk create, view credentials, download protected PDF, and confirm assignment list refreshes.
