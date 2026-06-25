## 1. Move PaymentResultPage to account feature

- [x] 1.1 Copy `apps/audience-web/src/features/orders/PaymentResultPage.tsx` to `apps/audience-web/src/features/account/PaymentResultPage.tsx`
- [x] 1.2 Update the import in `apps/audience-web/src/app/router.tsx` from `../features/orders/PaymentResultPage` to `../features/account/PaymentResultPage`
- [x] 1.3 Verify the route path `/orders/:id/result` remains unchanged (this is a payment gateway callback URL)
- [x] 1.4 Run the build to confirm no broken imports

## 2. Remove dead order components

- [x] 2.1 Delete `apps/audience-web/src/features/orders/MyOrdersPage.tsx` (confirmed dead code — no imports anywhere)
- [x] 2.2 Delete `apps/audience-web/src/features/orders/OrderDetailPage.tsx` (confirmed dead code — no imports anywhere)
- [x] 2.3 Delete the now-empty `apps/audience-web/src/features/orders/` directory
- [x] 2.4 Search codebase for any remaining references to `features/orders/MyOrdersPage` or `features/orders/OrderDetailPage` and remove them (e.g., barrel exports, stale comments)
- [x] 2.5 Run the build to confirm no broken imports after deletion

## 3. Consolidate order routing with redirects

- [x] 3.1 In `apps/audience-web/src/app/router.tsx`, replace the `/orders` route (currently rendering `MyOrdersPage`) with a `<Navigate to="/account/orders" replace />` redirect
- [x] 3.2 Replace the `/orders/:id` route (currently rendering `OrderDetailPage`) with a `<Navigate to="/account/orders/:id" replace />` redirect that preserves the `:id` param (use a small wrapper component or `useParams` + `Navigate`)
- [x] 3.3 Keep the `/orders/:id/result` route unchanged (payment gateway callback)
- [x] 3.4 Verify `/account/orders` and `/account/orders/:id` routes remain functional and still lazy-load from `features/account/`
- [x] 3.5 Manually test redirect behavior: navigate to `/orders` → should land on `/account/orders`; navigate to `/orders/123` → should land on `/account/orders/123`

## 4. Create shared UTF-8 BOM utility

- [x] 4.1 Create `packages/backend/src/shared/encoding/utf8.util.ts` with `stripBom(text: string): string` and `prependBom(text: string): string` functions
- [x] 4.2 Create `packages/backend/src/shared/encoding/utf8.util.spec.ts` with unit tests covering: strip BOM from text with BOM, strip BOM from text without BOM, prepend BOM to text without BOM, prepend BOM to text already with BOM
- [x] 4.3 Run the unit tests to confirm all pass

## 5. Refactor CSV parser to use shared utility

- [x] 5.1 In `packages/backend/src/guest-list-import/infrastructure/csv/guest-list-csv.parser.ts`, replace the inline BOM-stripping logic (`.replace(/^\uFEFF/, '')`) with an import of `stripBom` from `shared/encoding/utf8.util`
- [x] 5.2 Run existing guest-list CSV parser tests to confirm no regressions

## 6. Add Vietnamese text regression tests

- [x] 6.1 Add a test in the CSV parser test file that parses a CSV containing Vietnamese names with diacritics (`Nguyễn Văn Ân`, `Trần Thị Bích Hường`) and asserts the parsed output preserves all characters exactly
- [x] 6.2 Add a test for CSV with BOM + Vietnamese text to verify BOM is stripped and Vietnamese text is preserved
- [x] 6.3 Add a test in the SMTP email adapter test file that verifies Vietnamese text in email body is output with `charset=utf-8` header and diacritics preserved
- [x] 6.4 Add a test verifying Vietnamese text in email subject lines preserves diacritical characters
- [x] 6.5 Add a test verifying Vietnamese strings in API JSON responses are not Unicode-escaped or corrupted (can be added to an existing API integration test or `support.spec.ts`)
- [x] 6.6 Run all new regression tests to confirm they pass

## 7. Final verification

- [x] 7.1 Run full frontend build (`apps/audience-web`) to confirm zero errors
- [x] 7.2 Run full backend test suite to confirm zero regressions
- [x] 7.3 Verify `features/orders/` directory no longer exists
- [x] 7.4 Verify all order page routes resolve correctly in the browser (manual or E2E)
