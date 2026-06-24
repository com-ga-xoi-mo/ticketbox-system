## Why

TicketBox needs a separate audience-facing web surface for event discovery and customer self-service without diluting the existing organizer/admin portal in `apps/web`. Establishing the foundation now creates a production-feeling public app boundary that can reuse backend capabilities and shared contracts while keeping organizer/admin behavior stable.

## What Changes

- Add a new audience web app conceptually located at `apps/audience-web`, separate from the existing organizer/admin `apps/web`.
- Establish public routing, app shell, responsive public layout, and authenticated audience session boundaries.
- Use the existing `AUDIENCE` role for customer access; do not introduce a `CUSTOMER` role.
- Set up audience app API access, environment configuration, and TanStack Query providers using existing backend APIs and shared packages where available.
- Add an Ant Design-first UI foundation on Tailwind CSS v4, using shadcn-style owned local components for TicketBox-branded primitives and limiting Tailwind utility usage to layout glue and responsive constraints.
- Add workspace scripts for audience app development, build, test/typecheck, and verification.
- Keep `apps/web` organizer/admin behavior unchanged, including its current routing and role redirects.
- Scope any backend or shared API contract additions to the minimum required by the audience app foundation.

## Capabilities

### New Capabilities

- `audience-web-foundation`: Covers the separate audience-facing web app foundation, including app shell, routing, public layout, `AUDIENCE` auth/session boundary, API client setup, query provider, Ant Design/shadcn-oriented design baseline, and workspace scripts.

### Modified Capabilities

- `shared-api-contracts`: Add only the minimal framework-independent public HTTP contracts required for the audience web foundation when an existing backend endpoint is used without a shared contract.

## Impact

- Affected app surface: new `apps/audience-web` workspace app.
- Affected workspace configuration: root package scripts and workspace verification paths.
- Affected shared packages: `@ticketbox/api-types` only for missing audience-facing contracts that the new app consumes.
- Affected frontend dependencies: audience app UI dependencies should prioritize Ant Design, shadcn/Radix-style owned primitives, and Tailwind CSS v4; Tailwind should support tokens/layout rather than become the primary component styling strategy.
- Affected backend APIs: reuse existing routes by default; add or adjust only minimal read/session contract support if the audience foundation cannot function without it.
- Non-goals: no rewrite of `apps/web`, no replacement of organizer/admin flows, no new role model, and no full checkout or ticket-management feature build beyond foundation-level integration points.
