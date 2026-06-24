# Ticket QR Email Delivery Testing

The automated suite verifies QR payload recreation, PNG generation, queue safety, notification deduplication, retry behavior, and SMTP attachment mapping. A real Gmail delivery still requires the API, worker, PostgreSQL, Redis, and a successful paid-order flow.

## Automated verification

Run:

```powershell
node node_modules/vitest/vitest.mjs run packages/backend/src/notification packages/backend/src/ordering/infrastructure/events/ticket-issuing-order-event-publisher.spec.ts --passWithNoTests
npm run build
npx eslint packages/backend/src/notification packages/backend/src/ordering/infrastructure/events/ticket-issuing-order-event-publisher.spec.ts
```

## Local Maildev verification

Configure:

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=no-reply@ticketbox.test
EMAIL_SMTP_HOST=localhost
EMAIL_SMTP_PORT=1025
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EMAIL_SMTP_SECURE=false
MAILDEV_WEB_URL=http://localhost:1080
```

Start dependencies, API, and worker:

```powershell
npm run start:deps
npm run dev:api
npm run dev:worker
```

Create and pay a new order through the simulator, MoMo, or VNPay flow. Open `http://localhost:1080` and verify:

- one purchase confirmation email exists;
- the body lists every ticket number and ticket type;
- one PNG attachment exists per issued ticket;
- each attachment displays a different QR for a different ticket.

## Gmail verification

Use a Gmail App Password, not the normal account password:

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=<gmail-address>
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=<gmail-address>
EMAIL_SMTP_PASS=<16-character-app-password>
```

Restart both API and worker after changing environment variables. Pay a newly created order whose audience account uses an inbox you can inspect. Verify the same ticket count and QR attachments in Gmail.

If delivery fails, inspect the worker error and notification delivery attempt. The order must remain `PAID`, its tickets must remain issued, and the worker must retry only up to `EMAIL_MAX_ATTEMPTS`.

Never commit the Gmail App Password or paste it into logs, screenshots, issues, or documentation.
