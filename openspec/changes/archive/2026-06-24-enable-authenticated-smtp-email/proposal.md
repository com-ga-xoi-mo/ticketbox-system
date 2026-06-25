# Enable authenticated SMTP email delivery (e.g. Gmail)

## Why

Confirmation and reminder emails currently send only through a hand-rolled `SimpleSmtpClient`
(`smtp-email-channel.adapter.ts`) that speaks plain SMTP with **no STARTTLS/TLS and no AUTH**. That is
fine for the local Maildev demo (`localhost:1025`) but cannot deliver to real providers: Gmail
requires TLS on `smtp.gmail.com:587` (STARTTLS) or `:465` (implicit TLS) **and** authentication with an
account user + App Password. As a result the organizer cannot send real notification emails to actual
inboxes.

## What Changes

- Add a `nodemailer`-backed `SmtpEmailTransport` that supports TLS and authentication, selectable by
  config, while keeping the existing `SmtpEmailChannelAdapter` / `SmtpEmailTransport` port unchanged.
- When SMTP auth credentials are configured, the `smtp` email provider uses the authenticated TLS
  transport; when they are absent, it keeps the existing plaintext socket transport for Maildev.
- Add `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`, `EMAIL_SMTP_SECURE` config (validated env + getters) and
  document a Gmail setup (`smtp.gmail.com:587`, App Password).

## Impact

- Affected specs: `notification-delivery` (new requirement: authenticated SMTP email delivery).
- Affected code: `packages/backend/src/notification/infrastructure/email/**`,
  `packages/backend/src/platform/config/**`, `.env.example`, `packages/backend/package.json`
  (adds `nodemailer`).
- No change to notification use-cases, queue contracts, DB schema, or the local/Maildev behavior.
