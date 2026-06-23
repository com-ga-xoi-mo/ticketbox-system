## 1. Lint Cleanup

- [x] 1.1 Update `packages/backend/src/notification/application/use-cases/deliver-notification.use-case.spec.ts` so fake repository methods no longer trigger unused-parameter lint errors.
- [x] 1.2 Update `packages/backend/src/notification/testing/failing-email-channel.adapter.ts` so the failing email test adapter no longer triggers an unused-parameter lint error.
- [x] 1.3 Update `packages/backend/src/notification/infrastructure/queue/notification-processors.spec.ts` so imports used only as types use `import type`.

## 2. Verification

- [x] 2.1 Run `npm run lint` and confirm the notification delivery lint errors are gone.
- [x] 2.2 Run focused notification regression tests with `npm run test -- packages/backend/src/notification`.
- [x] 2.3 Confirm no files outside notification delivery test/support scope were changed.
