## Context

Email is delivered behind `NotificationChannelPort`. The `smtp` provider is wired in
`email-channel.provider.ts`, which builds a `SmtpEmailChannelAdapter` around a `SmtpEmailTransport`.
Today the only transport is `SmtpSocketTransport` (the hand-rolled `SimpleSmtpClient`): plaintext, no
AUTH. Maildev accepts that; Gmail rejects it (needs TLS + AUTH).

## Goals / Non-Goals

**Goals**
- Deliver real emails through an authenticated TLS SMTP provider (Gmail and any standard SMTP).
- Preserve the existing Maildev path and all current notification behavior/tests.
- Keep the `SmtpEmailChannelAdapter` and `SmtpEmailTransport` port untouched — only add a transport.

**Non-Goals**
- HTML emails / embedding QR images (tracked separately).
- Replacing or deleting the existing `SimpleSmtpClient` (kept for the no-auth Maildev path).
- Adding new channels (SMS/Zalo) — unrelated.

## Decisions

### D1: Add a nodemailer transport behind the existing `SmtpEmailTransport` port

Add `NodemailerSmtpTransport implements SmtpEmailTransport` wrapping `nodemailer.createTransport`.
It sends `text/plain` (same body as today) via `transporter.sendMail`. Because the channel adapter
depends only on the `SmtpEmailTransport` interface, no adapter/use-case change is needed.

**Rationale:** nodemailer is the standard, well-tested SMTP client; it handles STARTTLS, implicit TLS,
and AUTH that the hand-rolled client lacks. Hiding it behind the existing port keeps blast radius tiny.

### D2: Transport selection is credential-driven (no breaking default)

In `createEmailChannelAdapter`, for the `smtp` provider:
- If `EMAIL_SMTP_USER` **and** `EMAIL_SMTP_PASS` are set → `NodemailerSmtpTransport` with
  `{ host, port, secure: EMAIL_SMTP_SECURE, auth: { user, pass } }`.
- Otherwise → existing `SmtpSocketTransport` (Maildev), unchanged.

**Rationale:** local/CI demos that set `EMAIL_PROVIDER=smtp` against Maildev keep working with no new
config; Gmail is opt-in purely by providing credentials.

### D3: `secure` flag maps to the two Gmail modes

`EMAIL_SMTP_SECURE=false` (default) → STARTTLS, intended for port `587`.
`EMAIL_SMTP_SECURE=true` → implicit TLS, intended for port `465`. nodemailer auto-upgrades STARTTLS
when `secure:false` and the server advertises it, which is the Gmail-recommended `587` path.

## Risks / Trade-offs

- **[Secrets in env]** App Password lives in `EMAIL_SMTP_PASS`. Documented as env-only; never logged.
  Acceptable for a course/demo deployment.
- **[Gmail limits]** ~500 messages/day and possible throttling; fine for demo, noted for maintainers.
- **[Two SMTP code paths]** The plaintext client remains for Maildev. Accepted: it is the simplest way
  to keep the offline demo working without a TLS server.
