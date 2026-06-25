## Why

The `audience-web` frontend contains duplicated order page components across two feature directories (`features/orders/` and `features/account/`), creating maintenance confusion and dead code. The router already points to the `account` versions exclusively, leaving the `orders` versions as orphaned files. Additionally, the routing exposes redundant URL aliases (`/orders` and `/account/orders`) for identical pages, which should be consolidated. Separately, Vietnamese text encoding (UTF-8) handling needs an audit and hardening pass to prevent regressions, as the current implementations are scattered across multiple services without a unified encoding strategy.

## What Changes

- **Remove dead order page components**: Delete orphaned `MyOrdersPage.tsx` and `OrderDetailPage.tsx` from `features/orders/` (these are never imported; the active versions live in `features/account/`).
- **Consolidate order routing**: Unify the duplicate route paths (`/orders/*` and `/account/orders/*`) into a single canonical set of routes, with proper redirects from deprecated paths to preserve bookmarks and shared links.
- **Relocate PaymentResultPage**: Move `PaymentResultPage.tsx` out of `features/orders/` so the entire `features/orders/` directory can be removed, eliminating the split-directory confusion.
- **Audit and harden UTF-8 encoding**: Review and document all encoding touchpoints (CSV import/export, SMTP email, HTTP responses, AI text generation). Add missing safeguards and create a shared encoding utility where patterns are repeated.
- **Add encoding regression tests**: Create targeted tests for Vietnamese text round-tripping through CSV, email, and API response paths.

## Capabilities

### New Capabilities
- `encoding-hardening`: Centralized UTF-8 encoding utilities and regression test coverage for Vietnamese text across CSV, email, and API layers.

### Modified Capabilities
- `audience-order-history`: Routing consolidation and dead code removal for order pages; canonical URL structure changes from dual-path (`/orders` + `/account/orders`) to single canonical path with redirects.

## Impact

- **Frontend (`apps/audience-web`)**: Router configuration changes, component file moves/deletions, potential bookmark breakage mitigated by redirects.
- **Backend (`packages/backend`)**: Minor additions to encoding utilities; no API contract changes.
- **Testing**: New encoding regression tests; updated import paths in any test files referencing moved components.
- **User-facing URLs**: `/orders` and `/orders/:id` will redirect to `/account/orders` and `/account/orders/:id` (or vice versa, based on chosen canonical path). No functionality loss.
