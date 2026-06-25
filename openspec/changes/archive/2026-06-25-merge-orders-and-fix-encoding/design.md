## Context

The `audience-web` frontend app has accumulated duplicate order page components across two feature directories:

- **`features/orders/`** contains `MyOrdersPage.tsx`, `OrderDetailPage.tsx`, and `PaymentResultPage.tsx`
- **`features/account/`** contains `MyOrdersPage.tsx`, `OrderDetailPage.tsx`, and `OrderConfirmationPage.tsx`

The router (`app/router.tsx`) exclusively imports from `features/account/` for the order list and detail pages, making the `features/orders/` versions of `MyOrdersPage` and `OrderDetailPage` dead code. The only actively-used file in `features/orders/` is `PaymentResultPage.tsx` (routed at `/orders/:id/result`).

Additionally, the router defines redundant aliases: both `/orders` and `/account/orders` render the same components. This creates ambiguity about the canonical URL.

On the encoding side, Vietnamese UTF-8 handling is already implemented correctly across the codebase (CSV BOM handling, SMTP charset headers, PostgreSQL native UTF-8). However, these patterns are scattered without a unified utility, and there is no regression test coverage specifically for Vietnamese text round-tripping.

## Goals / Non-Goals

**Goals:**
- Eliminate dead code by removing orphaned order components from `features/orders/`
- Establish a single canonical URL pattern for order pages with redirects from the deprecated path
- Move `PaymentResultPage.tsx` to `features/account/` (or a shared location) so `features/orders/` can be fully deleted
- Create a lightweight shared encoding utility to centralize repeated UTF-8/BOM patterns
- Add regression tests for Vietnamese text encoding across CSV, email, and API paths

**Non-Goals:**
- Rewriting the order pages themselves (the `features/account/` versions are feature-complete)
- Changing the backend API contracts (routes, response shapes)
- Adding new encoding features (e.g., multi-language support beyond Vietnamese)
- Refactoring the overall feature directory structure beyond order-related files

## Decisions

### Decision 1: Canonical URL is `/account/orders`

**Choice**: Keep `/account/orders` and `/account/orders/:id` as the canonical paths. Add `<Navigate>` redirects from `/orders` and `/orders/:id` to these paths.

**Rationale**: The `/account/orders` path is semantically correct (orders belong under the user's account section) and aligns with the existing `features/account/` directory structure. The `audience-order-history` spec already references `/account/orders` as the canonical path.

**Alternatives considered**:
- Use `/orders` as canonical: Shorter URL but loses the account namespace context. Would require moving components out of `features/account/`.
- Keep both paths: Status quo; adds confusion and makes analytics/SEO harder.

### Decision 2: Move `PaymentResultPage` to `features/account/`

**Choice**: Relocate `PaymentResultPage.tsx` from `features/orders/` to `features/account/` and update the router import. The route path `/orders/:id/result` remains unchanged (it is a payment gateway callback URL that must not change).

**Rationale**: This allows full deletion of the `features/orders/` directory. `PaymentResultPage` is conceptually part of the order flow and belongs alongside the other order pages.

**Alternatives considered**:
- Keep `features/orders/` with only `PaymentResultPage`: Leaves an oddly single-file directory.
- Move to `features/payment/`: Overcomplicates the structure for one file.

### Decision 3: Encoding utility as a shared module

**Choice**: Create `packages/backend/src/shared/encoding/utf8.util.ts` with helper functions for BOM stripping and BOM prepending. Refactor existing inline usages in CSV parser and CSV export to use this utility.

**Rationale**: The BOM handling logic is duplicated between `guest-list-csv.parser.ts` (strip BOM) and `AdminReportsPage.tsx` (prepend BOM). A shared utility prevents drift and makes the pattern discoverable.

**Alternatives considered**:
- Leave inline: Works today but risks inconsistency as more encoding touchpoints are added.
- Use an npm package: Overkill for two simple utility functions.

### Decision 4: Regression tests use Vietnamese sample data

**Choice**: Tests will use real Vietnamese strings (diacritics, special characters like `ắ`, `ễ`, `ợ`, `ừ`) to verify round-trip correctness through CSV parse/serialize and email content paths.

**Rationale**: Vietnamese diacritics are the primary encoding concern. Using real text ensures the tests catch actual failures rather than passing trivially with ASCII.

## Risks / Trade-offs

- **[Bookmark breakage]** → Mitigated by `<Navigate replace>` redirects from `/orders` to `/account/orders`. Users with saved bookmarks will be transparently redirected.
- **[Payment gateway callback URL]** → The `/orders/:id/result` path is a callback URL registered with payment providers (VNPAY, MoMo). This path MUST NOT change. Only the component file location changes, not the route path.
- **[Frontend CSV export utility location]** → The BOM-prepend utility for CSV export lives in the frontend (`apps/web`), while the BOM-strip utility is in the backend. A shared utility in `packages/backend` won't help the frontend. We'll create the backend utility for backend usage and leave the frontend BOM logic inline (it's a single line).
- **[Test maintenance]** → Vietnamese text in test fixtures requires the test files themselves to be UTF-8 encoded. Modern tooling handles this by default, but CI environments should be verified.
