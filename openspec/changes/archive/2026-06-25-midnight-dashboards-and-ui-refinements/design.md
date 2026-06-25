## Context

TicketBox recently underwent a comprehensive UX/UI upgrade and the introduction of advanced analytics tools for both platform administrators and event organizers. The new aesthetic, termed "Midnight Venue," needed to be retrofitted into the existing React/Tailwind frontend while ensuring the backend queries for analytical data were highly performant.

## Goals / Non-Goals

**Goals:**
- Implement the "Midnight Venue" dark theme consistently across the platform.
- Introduce zero-client-calculation analytics by heavily utilizing Prisma `$queryRaw` and `.aggregate` in NestJS.
- Ensure strict data isolation (Organizers only see their own metrics).
- Elevate overall UX with standardized dialogs, toasts, better typography, and pagination.

**Non-Goals:**
- A full redesign of the mobile application (currently focused on web/desktop).
- Replacing standard UI elements with a completely custom CSS library (we are retaining `shadcn/ui` but applying custom theme classes).

## Decisions

1. **Analytics Engine via Prisma `$queryRaw`**
   - *Rationale*: Processing thousands of orders and tickets in memory (Node.js) to calculate daily revenue arrays and check-in percentages would bottleneck the server.
   - *Alternative*: Client-side calculation (rejected due to payload size).
   - *Decision*: We wrote raw SQL queries joined with CTEs to format daily revenue trend lines directly inside PostgreSQL.

2. **Frontend Charting Library**
   - *Decision*: Adopt `recharts` for rendering Sales Velocity (AreaChart) and Revenue Trend (BarChart).
   - *Rationale*: It integrates perfectly with React and allows simple, arbitrary CSS colors (`#d0bcff`, `#4cd7f6`) that align with the Midnight theme without fighting a Canvas-based library.

3. **Status Badges Color Normalization**
   - *Decision*: Map backend enums directly to frontend specific shades: DRAFT (Amber), PUBLISHED (Purple), CANCELLED (Red), ENDED (Gray). This avoids confusion and helps users scan tables faster.

4. **Notifications**
   - *Decision*: Integrate `sonner` over the built-in shadcn toaster for improved animation performance and easier global API (`toast.success()`).

## Risks / Trade-offs

- **Risk (SQL Injection)** → *Mitigation*: All dynamic filters (like `search`, `status`) inside `$queryRaw` are strictly typed, and conditionals are built using the `Prisma.sql` tagged template literal rather than string concatenation.
- **Risk (UI Drift)** → *Mitigation*: The Midnight theme heavily overrides default `shadcn/ui` variants. Future updates to shadcn components must be manually checked against the dark theme parameters.
