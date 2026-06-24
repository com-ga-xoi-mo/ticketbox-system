## 1. Dependency

- [x] 1.1 Add `nodemailer` (+ `@types/nodemailer` dev) to `packages/backend/package.json`; install

## 2. Config

- [x] 2.1 Add `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS` (optional), `EMAIL_SMTP_SECURE` (bool, default false) to `env.schema.ts`
- [x] 2.2 Add `emailSmtpUser`, `emailSmtpPass`, `emailSmtpSecure` getters to `PlatformConfigService`
- [x] 2.3 Document Gmail setup in `.env.example` (smtp.gmail.com:587, App Password, 2FA note)

## 3. Transport

- [x] 3.1 Add `NodemailerSmtpTransport implements SmtpEmailTransport` in `notification/infrastructure/email/nodemailer-smtp-transport.ts` (host/port/secure/auth → `nodemailer.createTransport` + `sendMail` text body)
- [x] 3.2 In `email-channel.provider.ts`, for `smtp` provider: use `NodemailerSmtpTransport` when user+pass set, else keep `SmtpSocketTransport`
- [x] 3.3 Unit test the provider selection (auth set → nodemailer transport; absent → socket transport) and the transport's sendMail mapping

## 4. Verification

- [x] 4.1 `npm run build && npm run lint && npm run test` — all pass
- [x] 4.2 Manual: set `EMAIL_PROVIDER=smtp` + Gmail creds → pay an order → confirm email arrives in a real Gmail inbox; with no creds, Maildev still receives mail
