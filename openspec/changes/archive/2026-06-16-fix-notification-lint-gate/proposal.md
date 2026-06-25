## Why

The repository lint gate currently fails on notification delivery test/support code, blocking validation of the existing notification implementation. This needs a narrow cleanup change so the lint gate can pass without changing notification delivery behavior.

## What Changes

- Fix unused parameter lint failures in notification delivery test doubles and support adapters.
- Convert type-only imports in notification processor specs to `import type`.
- Keep the change limited to notification delivery test/support files that are currently failing ESLint.
- Do not change notification runtime behavior, queue contracts, email delivery behavior, database schema, API surface, or mobile app code.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `notification-delivery`: Add a narrow quality requirement that notification delivery test/support code must satisfy the repository lint gate without changing runtime notification behavior.

## Impact

- Affected code is limited to notification delivery spec/support files under `packages/backend/src/notification`.
- No API, database, queue payload, email adapter contract, dependency, or mobile app changes are expected.
- Verification should run `npm run lint` and focused notification regression tests.
