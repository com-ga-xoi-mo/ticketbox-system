## Context

The repository is an npm workspace with `apps/*` and `packages/*`. `apps/web` already exists and is described as the admin and organizer web portal; its auth behavior intentionally routes `ADMIN` and `ORGANIZER` users into management pages while users with only `AUDIENCE` are denied access. Backend support for audience flows already exists in part through public concert catalog routes (`GET /concerts`, `GET /concerts/:slug`, `GET /concerts/:slug/availability`), `POST /auth/login`, `GET /me/profile`, and protected audience order/ticket routes.

The new audience web app should therefore be a sibling workspace app, not a mode inside `apps/web`. The implementation should reuse existing backend APIs, `@ticketbox/api-types`, auth conventions, and UI patterns where they fit, while allowing the audience surface to have its own public layout, navigation, and a modern "Ocean Trust" (Blue/Slate) visual direction to ensure a calm, trustworthy, and premium ticket marketplace experience. The UI implementation should be component-led: Ant Design is the default source for mature controls, shadcn/Radix-style owned components provide branded primitives, and Tailwind CSS v4 provides token/layout infrastructure while utility usage stays limited to layout composition rather than bespoke component styling.

## Goals / Non-Goals

**Goals:**

- Create a separate `apps/audience-web` React/Vite app foundation with its own routing, providers, environment config, styles, and verification commands.
- Keep customer access tied to the existing `AUDIENCE` role and avoid introducing a `CUSTOMER` role in UI, API contracts, or backend authorization.
- Provide public routes for the audience marketing/catalog shell and protected routes for account-oriented audience pages.
- Set up a centralized API client, auth token/session handling, TanStack Query provider, query key conventions, and response validation for shared contracts where available.
- Establish a modern responsive design baseline that prioritizes Ant Design components, uses shadcn/Radix-style owned local components for brand-specific primitives, uses Tailwind CSS v4, and avoids Tailwind-heavy one-off component styling.
- Add minimal shared API contracts for public audience catalog responses that the new app consumes before duplicating ad hoc wire types.
- Leave the existing organizer/admin `apps/web` behavior unchanged.

**Non-Goals:**

- Rebuilding organizer/admin pages or moving `apps/web` routes.
- Implementing complete checkout, payment, account, or ticket-management flows beyond foundation-level routes, guards, client setup, and reusable UI states.
- Adding a new role, changing the backend role enum, or renaming `AUDIENCE` to `CUSTOMER`.
- Redesigning backend domain models or replacing existing public concert/order endpoints.

## Decisions

1. **Create a sibling Vite app at `apps/audience-web`.**

   Rationale: `apps/web` has role redirects and navigation that are specific to admin and organizer work. A separate workspace keeps audience routing, layout, dependencies, and release checks isolated.

   Alternative considered: add an audience route tree inside `apps/web`. This would couple public audience UX to management-shell auth decisions and increases the chance of regressions in existing organizer/admin behavior.

2. **Use `AUDIENCE` as the only customer role.**

   Rationale: RBAC already defines `AUDIENCE`, backend audience endpoints already guard with `Role.AUDIENCE`, and adding `CUSTOMER` would create duplicate identity semantics.

   Alternative considered: introduce a frontend-only `CUSTOMER` label. This would obscure authorization behavior and make shared contracts harder to reason about.

3. **Reuse the current React/Vite/TanStack Query shape from `apps/web`, with independent files.**

   Rationale: The existing web app already proves the workspace can run Vite, React Router, local auth storage, fetch-based API clients, and TanStack Query. The audience app should reuse those patterns without importing management-specific components.

   Alternative considered: extract a shared frontend package immediately. That can be useful later, but doing it during foundation work risks broad churn in the admin app. Start with local audience primitives and extract only after duplication is real.

4. **Adopt an Ant Design-first component strategy with shadcn-style owned primitives.**

   Rationale: Ant Design should carry mature interaction surfaces such as forms, inputs, selects, date pickers, modals, drawers, dropdowns, menus, tabs, pagination, skeletons, empty states, alerts, notifications, and data-heavy widgets. shadcn/Radix-style local components should be used where TicketBox needs brand ownership and source-level customization: event cards, ticket cards, section shells, branded buttons, badges, dialog wrappers, and reusable page states. Tailwind CSS v4 should provide modern CSS-first token/layout support and align with current shadcn guidance, but it should not become the default way to hand-build every component.

   Alternative considered: all Ant Design. This would make the app faster to scaffold but risks a generic enterprise feel for a consumer-facing ticket marketplace. All custom/shadcn components would maximize brand control but increase delivery cost for mature controls that Ant Design already solves. Tailwind-heavy custom UI would be flexible but would create more styling code, more edge cases, and less consistency.

5. **Use official component knowledge before implementing Ant Design or shadcn components.**

   Rationale: The Ant Design skill requires documented APIs, token-first theming, one root `ConfigProvider`, no invented props, no broad `.ant-*` selector overrides, and CLI/doc lookup before changing AntD component code. The shadcn skill frames shadcn as copied, owned source components built on accessible primitives, not an npm component dependency, and its current guidance expects Tailwind CSS v4. Apply should read these skills when UI implementation starts and configure the audience app around Tailwind v4 intentionally rather than inheriting the organizer app's Tailwind v3 setup.

   Alternative considered: rely on memory or generic component snippets. That is faster initially but makes regressions more likely because AntD and shadcn APIs evolve and this app should feel production-grade.

6. **Add shared audience catalog contracts before consuming public catalog responses.**

   Rationale: `@ticketbox/api-types` is the boundary package for framework-independent HTTP contracts, but currently only covers auth/check-in contracts. The audience app needs typed, validated catalog responses without duplicating backend presenter shapes in app code.

   Alternative considered: define audience wire types inside `apps/audience-web`. That is acceptable for throwaway prototypes but conflicts with the existing shared-contract direction and makes backend/frontend compatibility harder to test.

7. **Protect only account-oriented routes, not public discovery routes.**

   Rationale: Ticket discovery and event detail pages must be browseable without a session. Account, checkout entry points, orders, and tickets require an authenticated session whose decoded roles include `AUDIENCE`.

   Alternative considered: require login before all audience pages. That would hurt public discovery and is inconsistent with ticket marketplace UX.

## Risks / Trade-offs

- [Risk] Ant Design can make the audience app feel generic or enterprise-heavy. -> Mitigation: use AntD for mature controls, configure it through `ConfigProvider` and tokens, wrap recurring patterns, and reserve shadcn-style owned components for brand-defining surfaces.
- [Risk] Tailwind v4 may require config/PostCSS patterns that differ from the existing organizer app's Tailwind v3 setup. -> Mitigation: configure Tailwind v4 locally inside `apps/audience-web`, do not migrate `apps/web`, and verify both apps independently.
- [Risk] shadcn guidance may imply React 19 assumptions that do not match the selected audience app React version. -> Mitigation: treat shadcn as an owned-component pattern, verify React version compatibility during setup, and adapt primitives without changing unrelated workspace apps.
- [Risk] Tailwind utility usage can sprawl into a parallel design system. -> Mitigation: use Tailwind v4 for CSS-first tokens, layout, spacing, responsive wrappers, and small composition utilities; prefer AntD/shadcn components for controls and reusable UI.
- [Risk] Shared contracts may reveal backend response inconsistencies. -> Mitigation: add contract schemas and backend mapper tests for only the public catalog endpoints used by the foundation.
- [Risk] Auth/session code may drift from `apps/web`. -> Mitigation: mirror proven token handling behavior initially and consider extraction only after both apps need the same implementation.
- [Risk] The audience app could accidentally depend on organizer/admin modules. -> Mitigation: keep imports inside `apps/audience-web` plus public packages such as `@ticketbox/api-types`; add verification coverage for app build/typecheck.
- [Risk] Foundation pages can become empty placeholders. -> Mitigation: include realistic loading, empty, error, and responsive states in the baseline so the app feels production-ready even before full checkout/account features land.

## Migration Plan

1. Add `apps/audience-web` with Vite, React, TypeScript, React Router, TanStack Query, Ant Design, shadcn/Radix-style owned component support, Tailwind CSS v4/local CSS for layout and tokens, and selected UI dependencies.
2. Add root scripts such as `dev:audience-web` and `verify:audience-web` without changing existing `dev:web` or `verify:web`.
3. Add missing shared public catalog contracts in `@ticketbox/api-types`, export them from the package root, and cover them with contract tests.
4. Wire the audience app API client to `VITE_API_BASE_URL`, token storage, shared schemas, and centralized `401` handling.
5. Build public and protected route shells with AntD components where appropriate, shadcn-style owned brand primitives where needed, and limited Tailwind v4 layout utilities.
6. Run UI quality checks: AntD API/lint workflow where available, responsive visual verification, and web design guideline/accessibility review.
7. Verify `apps/web` still passes its existing checks and the new audience app passes its own verification.

Rollback is straightforward because the new app is additive: remove the new workspace app, scripts, and shared catalog contract additions if needed. Existing organizer/admin routes should remain untouched throughout the change.

## Open Questions

- Should the first audience home page fetch live `GET /concerts` data immediately, or should it ship with route/client wiring and a non-fetching landing shell until catalog UX is designed?
- Which Ant Design version and CLI/doc workflow should the implementation use for this workspace?
- Which shadcn/Radix-style primitives should be owned locally first instead of relying on AntD defaults?
- Which exact Tailwind v4 setup should `apps/audience-web` use with Vite so it stays isolated from `apps/web`?
- Should future shared frontend code live in a dedicated package after the audience and organizer apps have enough proven overlap?
