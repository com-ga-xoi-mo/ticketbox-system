## Why

The platform lacked high-level observability for both Admins and Organizers, making it difficult to track revenue, check-in rates, and overall event performance. Furthermore, several core UI components (Venue Map, Staff Accounts, Notifications, Dialogs) were fragmented, lacked a consistent design system, and had UX issues (like double scrollbars, unclear status badges, and clunky menus). This update retroactively documents the overhaul that introduced the unified "Midnight Venue" aesthetic, high-performance analytics, and significantly polished UX across the app.

## What Changes

- Implement a high-performance Analytics API using Prisma `$queryRaw` and aggregates for both Admin and Organizers, ensuring data isolation.
- Redesign Admin and Organizer Dashboards following the "Midnight Venue" dark-mode glassmorphism theme, integrating `recharts` for data visualization.
- Build a comprehensive "Analytics & Reports" data grid page for Admins featuring CSV export, pagination, and dynamic filters.
- Refactor the Venue Map UI to fix scrolling issues, move media upload to the sidebar, and improve schedule/duration display.
- Overhaul the Staff/Accounts management table (split columns, typography tweaks, hover actions instead of 3-dot menus, no horizontal borders).
- Standardize all Confirm Dialogs (using Shadcn `AlertDialog` with Midnight styling) and implement global toast notifications via `sonner`.
- Unify Concert status badge colors globally (DRAFT=Amber, PUBLISHED=Purple/Indigo, CANCELLED=Red, ENDED=Gray).

## Capabilities

### New Capabilities
- `analytics-dashboards`: Provides high-level revenue and operational metrics for Admins and Organizers via fast, aggregated APIs and Midnight-themed UI.
- `analytics-reports`: Offers paginated, filterable, and exportable data grids for in-depth platform analysis.
- `global-notifications`: Standardizes system feedback using toast notifications (`sonner`) and custom alert dialogs.

### Modified Capabilities
- `venue-map-management`: Refining layout, scrolling, media upload placement, and schedule display logic.
- `staff-management`: Improving the account listing UX with hover actions, better typography, and pagination.
- `concert-management`: Standardizing status badge colors across the platform.

## Impact

- **Backend:** New controllers (`AdminAnalyticsController`, `OrganizerAnalyticsController`) and complex aggregate/raw SQL use cases added to `concert-management` module.
- **Frontend UI:** `recharts` and `sonner` added as dependencies. Global dark mode / Midnight theme styling applied to dashboards, dialogs, and tables. 
- **UX:** Improved performance (reduced client-side calculations) and smoother interactions (hover actions, clear toasts, better scrolling).
