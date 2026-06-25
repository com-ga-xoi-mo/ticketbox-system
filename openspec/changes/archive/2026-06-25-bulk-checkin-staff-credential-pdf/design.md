## Context

The admin web already has a Staff Assignment page that selects a concert and assigns existing `CHECKIN_STAFF` users through `POST /admin/concerts/:concertId/staff`. The backend identity module can create admin-managed users with roles, and check-in staff assignments already support `gateName = null` for concert-wide access.

This change combines account creation, role assignment, concert assignment, and credential handoff for temporary check-in staff. The sensitive part is password handling: generated login passwords must be visible once for export, but raw passwords must not be persisted or made retrievable later.

## Goals / Non-Goals

**Goals:**
- Add an admin-only bulk endpoint that creates check-in staff accounts and assigns them to one selected concert.
- Generate deterministic email candidates from a base email and validate the whole batch before creating records.
- Generate a distinct secure login password for each account, hash it before persistence, and return the raw password only in the creation response.
- Add admin UI for bulk creation, email preview, credential result display, and password-protected PDF download.
- Require an admin-entered PDF open password before producing the credential PDF.

**Non-Goals:**
- Gate-level distribution is out of scope for v1; all created assignments use `gateName = null`.
- The system will not store raw account passwords or regenerate the same credential PDF after refresh.
- The system will not send the PDF or PDF password to organizers automatically.
- Existing single-staff assignment behavior remains unchanged.

## Decisions

1. **Create a new admin-only bulk endpoint under the concert staff route.**
   - Use `POST /admin/concerts/:concertId/staff/bulk-create` so the selected concert remains the parent resource.
   - Restrict to `ADMIN` because the operation creates user accounts and grants check-in access.
   - Alternative considered: reuse `POST /admin/users` repeatedly from the frontend, then assign each user. That would expose partial failure handling to the browser and make atomic validation harder.

2. **Perform backend batch validation before writes, then write inside one logical operation.**
   - Normalize and validate the base email, derive all target emails, reject duplicate generated emails, and reject any email that already exists before creating users.
   - Use a transaction or equivalent repository operation so user creation and assignment creation do not leave a partially provisioned batch when a later write fails.
   - Alternative considered: best-effort creation with per-row errors. That is harder for admins to reason about and conflicts with the requirement to avoid half-created batches.

3. **Use numeric suffixing for generated emails.**
   - Derive `local@domain` for the first account and `local1@domain`, `local2@domain` for later accounts.
   - Keep display names predictable from `displayNamePrefix` and sequence number.
   - Alternative considered: separator-based numbering, which avoids some real-address collisions but does not match the requested account naming style.

4. **Return raw login passwords only once.**
   - Generate account passwords server-side with a cryptographically secure random source.
   - Persist only password hashes.
   - Return raw passwords in the successful bulk response so the admin can immediately download the PDF.
   - Alternative considered: store encrypted passwords for later PDF downloads. That increases credential retention risk and is unnecessary for a one-time handoff.

5. **Generate the protected PDF in the admin frontend.**
   - Keep the PDF generation tied to the one-time credentials already held in browser memory after success.
   - Require a PDF open password field before enabling download.
   - Use a PDF library that supports encryption/password protection, such as `jspdf` with encryption options and a compatible table renderer. If the selected library cannot enforce an open password, the implementation must choose a different library rather than producing an unprotected PDF.
   - Alternative considered: backend PDF endpoint. That would either require resending raw credentials or storing them, both of which are worse for this workflow.

## Risks / Trade-offs

- **Risk: Browser memory contains raw credentials after creation** -> Clear the credential result when the admin navigates away or starts a new bulk create, and never persist credentials to local storage/query cache beyond the immediate mutation result.
- **Risk: PDF library claims export support but not actual encryption** -> Add a verification task that opens or inspects the generated file and confirms a password is required.
- **Risk: Numeric-suffixed emails may collide with existing managed accounts** -> Preflight the full generated email list against the database before hashing passwords or creating any records.
- **Risk: Large batches slow account creation or PDF rendering** -> Enforce a conservative maximum quantity in validation and show frontend validation before submit.
- **Risk: Admin loses credentials before downloading** -> Make the UI explicit that credentials and PDF download are available only immediately after creation.
