## 1. Shared Contract Foundation

- [x] 1.1 Inspect the public concert catalog response shapes returned by `GET /concerts`, `GET /concerts/:slug`, and `GET /concerts/:slug/availability`.
- [x] 1.2 Add framework-independent Zod schemas and inferred types for audience public catalog list, detail, and availability responses in `@ticketbox/api-types`.
- [x] 1.3 Export the new audience catalog schemas and types from the `@ticketbox/api-types` package root.
- [x] 1.4 Add package-level contract tests proving valid audience catalog payloads parse and malformed payloads fail.
- [x] 1.5 Add backend HTTP mapper or adapter contract tests validating representative public catalog responses against the shared schemas.

## 2. Audience App Workspace Setup

- [x] 2.1 Create the `apps/audience-web` workspace app with Vite, React, TypeScript, React Router, TanStack Query, Ant Design, shadcn/Radix-style owned component support, Tailwind CSS v4/local CSS configuration, and Vitest configuration.
- [x] 2.2 Add `apps/audience-web/package.json` scripts for `dev`, `build`, `typecheck`, `test`, and `verify`.
- [x] 2.3 Add audience app environment handling and `.env.example` with the audience API base URL configuration.
- [x] 2.4 Add root workspace scripts for `dev:audience-web` and `verify:audience-web` without changing the existing `dev:web` and `verify:web` behavior.
- [x] 2.5 Configure Tailwind CSS v4 for `apps/audience-web` in a way that is isolated from the existing `apps/web` Tailwind setup.
- [x] 2.6 Confirm the existing `@ticketbox/web` organizer/admin app still verifies independently after the new workspace is added.

## 3. Audience App Providers and API Client

- [x] 3.1 Add the audience app entrypoint, root app component, router bootstrap, and shared provider composition.
- [x] 3.2 Configure a single TanStack Query client provider above the audience route tree.
- [x] 3.3 Implement the audience API client with environment-based base URL resolution, JSON handling, bearer-token attachment, and centralized `401` handling.
- [x] 3.4 Implement audience query key conventions and public catalog client functions that validate responses with the shared catalog schemas.
- [x] 3.5 Add focused tests for API base URL handling, bearer header attachment, response validation, and unauthorized session clearing.

## 4. Audience Authentication Boundary

- [x] 4.1 Implement access-token storage, JWT decoding, session restoration, and malformed-token clearing for the audience app.
- [x] 4.2 Implement audience login using the existing `POST /auth/login` route and shared auth contract types.
- [x] 4.3 Implement protected-route guards that allow sessions with `AUDIENCE`, redirect unauthenticated visitors to audience login, and show access denied for authenticated non-audience users.
- [x] 4.4 Add tests proving `AUDIENCE` is the customer role used by guards and that no `CUSTOMER` role is introduced.
- [x] 4.5 Add tests for successful login, invalid credentials, session restore, malformed token handling, and intended-destination redirect behavior.

## 5. Public Routing and Layout

- [x] 5.1 Build the public audience layout with responsive header/navigation, content regions, footer, and mobile navigation behavior.
- [x] 5.2 Add route definitions for home, event listing, event detail, login, protected account placeholders, access denied, and not found.
- [x] 5.3 Wire public catalog routes to existing public concert catalog endpoints through TanStack Query where live data is used.
- [x] 5.4 Add polished loading, empty, and error states for data-dependent public routes.
- [x] 5.5 Add route/layout tests covering public unauthenticated browsing, protected-route redirects, access denied, and unknown-route fallback.

## 6. Design System Baseline

- [x] 6.1 Read/apply the Ant Design skill and shadcn-ui skill guidance before implementing UI components, including AntD documented API usage, token-first theming, no broad `.ant-*` overrides, Tailwind CSS v4-aware shadcn patterns, and shadcn-style owned component composition.
- [x] 6.2 Define audience design tokens for color, typography, spacing, radius, focus states, responsive constraints, and base global styles, then map them into Ant Design `ConfigProvider` tokens, Tailwind CSS v4 theme variables, and local component CSS variables.
- [x] 6.3 Establish the Ant Design-first component baseline for forms, inputs, selects, date pickers, modals, drawers, dropdowns, menus, tabs, pagination, skeletons, empty states, alerts, notifications, and other mature controls used by the foundation.
- [x] 6.4 Implement shadcn/Radix-style owned local primitives for TicketBox-branded surfaces such as event cards, ticket cards, section shells, branded buttons, badges, dialog wrappers, and reusable page states.
- [x] 6.5 Limit Tailwind v4 usage to layout, spacing, responsive wrappers, token utilities, and small composition helpers; remove or avoid large one-off Tailwind class blocks for reusable controls.
- [x] 6.6 Apply the AntD/shadcn baseline to the public shell and initial routes so the app feels production-ready at mobile and desktop widths.
- [x] 6.7 Add component or rendering tests for AntD wrappers, local owned primitives, and reusable loading, empty, and error states.
- [x] 6.8 Run a web design guideline/accessibility review of the audience UI files and address findings before marking the design-system baseline complete.

## 7. Verification

- [x] 7.1 Run `npm run build:api-types` and the `@ticketbox/api-types` contract tests.
- [x] 7.2 Run the audience app typecheck, tests, and build through `npm run verify:audience-web`.
- [x] 7.3 Run the existing organizer/admin web verification through `npm run verify:web`.
- [x] 7.4 Run Ant Design verification where available, including documented API checks before implementation and `antd lint <changed-path> --format json` after AntD component changes when the CLI is installed.
- [x] 7.5 Run responsive visual verification for the audience app at mobile and desktop widths, checking for text clipping, layout overlap, and broken loading/empty/error states.
- [x] 7.6 Run workspace-level verification needed by the repo to confirm the new app and shared contracts do not break existing packages.
- [x] 7.7 Document any remaining foundation limitations or follow-up work discovered during verification.
