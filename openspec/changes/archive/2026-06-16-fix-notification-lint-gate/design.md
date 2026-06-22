## Context

`npm run lint` currently fails on five ESLint errors in notification delivery test/support files:

- `packages/backend/src/notification/application/use-cases/deliver-notification.use-case.spec.ts`
- `packages/backend/src/notification/infrastructure/queue/notification-processors.spec.ts`
- `packages/backend/src/notification/testing/failing-email-channel.adapter.ts`

The affected files support the existing worker-driven notification flow and do not require changes to queue payloads, email sending behavior, database persistence, API routes, or mobile code.

## Goals / Non-Goals

**Goals:**

- Restore the repository lint gate for the notification delivery slice.
- Keep the fix limited to the notification delivery files currently reported by ESLint.
- Preserve the current notification delivery regression coverage.
- Use TypeScript/ESLint-compliant patterns for unused method parameters and type-only imports.

**Non-Goals:**

- No notification delivery behavior changes.
- No queue job name, job payload, retry, backoff, or worker wiring changes.
- No email provider behavior changes.
- No schema, migration, API surface, frontend, or mobile app changes.
- No broad formatter/lint cleanup outside the failing notification files.

## Decisions

### Decision 1: Treat unused parameters as intentionally omitted or voided in test/support code

Where fake implementations only need to satisfy an interface, the implementation should avoid declaring unused named parameters when TypeScript allows it. If a parameter must remain present for clarity or compatibility, it should be consumed in a no-op expression rather than changing the interface or production behavior.

Rationale:

- The lint failure is in test/support code, not in notification domain behavior.
- Removing or explicitly consuming unused parameters keeps the fake adapter/test double compliant without relaxing lint rules.

Alternatives considered:

- Disable the lint rule for the files: rejected because this weakens the lint gate for future notification tests.
- Rename parameters with an underscore: rejected because the current lint configuration still reports underscore-prefixed unused parameters.

### Decision 2: Use `import type` for processor spec dependencies used only at compile time

`notification-processors.spec.ts` should convert value imports that are used only in casts/types to `import type`.

Rationale:

- This directly satisfies `@typescript-eslint/consistent-type-imports`.
- It avoids runtime imports for classes that the spec only references as TypeScript types.

Alternatives considered:

- Instantiate the real classes to make imports runtime values: rejected because the processor spec intentionally uses lightweight test doubles.
- Disable the rule for the imports: rejected because the codebase already has a clear style requirement.

### Decision 3: Verify both lint and notification regressions

The implementation should run the full repository lint command and focused notification tests after the edit.

Rationale:

- `npm run lint` is the failing gate this change is meant to restore.
- Focused notification regression tests make sure the cleanup does not accidentally change purchase-confirmation creation, delivery retry handling, or processor behavior.

## Risks / Trade-offs

- [Risk] A no-op consumption of a parameter can look unnecessary to future readers. -> Mitigation: prefer omitting parameters where the interface and TypeScript method compatibility allow it; use no-op consumption only when a parameter must remain explicit.
- [Risk] Running only focused tests could miss a broader lint/test interaction. -> Mitigation: include `npm run lint` and focused notification tests as required verification, and allow full `npm test` if time permits.
- [Risk] A broad auto-fix could touch unrelated files. -> Mitigation: do not use repository-wide formatting or lint auto-fix for implementation; edit only the files reported by the lint gate.
