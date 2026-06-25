## 1. Backend Analytics APIs

- [x] 1.1 Implement `GetAdminDashboardMetricsUseCase` using Prisma aggregates and `$queryRaw` to fetch platform total revenue, active concerts, and top grossing concerts.
- [x] 1.2 Implement `GetOrganizerDashboardMetricsUseCase` with hardcoded `organizerId` filtering to calculate total revenue, ticket sales velocity, and check-in rates.
- [x] 1.3 Create `ListAdminAnalyticsReportsUseCase` to generate paginated, filterable reports of all events.
- [x] 1.4 Expose `AdminAnalyticsController` and `OrganizerAnalyticsController` endpoints protected by JWT and Role guards.

## 2. Frontend Analytics Clients & Routing

- [x] 2.1 Add API client functions (`getAdminDashboardMetrics`, `getOrganizerDashboardMetrics`, `listReports`) using `react-query`.
- [x] 2.2 Update `router.tsx` to mount `/admin/dashboard`, `/organizer/dashboard`, and `/admin/reports` with proper Role protection.
- [x] 2.3 Update `sidebar-config.ts` to include links to Dashboards and Reports with appropriate icons and role restrictions.
- [x] 2.4 Fix `role-access.ts` to correctly redirect Organizer logins to `/organizer/dashboard`.

## 3. UI Implementation: Midnight Theme Dashboards

- [x] 3.1 Install `recharts` for charting.
- [x] 3.2 Build `AdminDashboard.tsx` with Midnight aesthetic, integrating `recharts` for Revenue Trend and a custom data grid for Top Grossing Concerts.
- [x] 3.3 Build `OrganizerDashboard.tsx` with Midnight aesthetic, including a custom SVG ring chart for Check-in Rate and Area Chart for Sales Velocity.
- [x] 3.4 Build `AdminReportsPage.tsx` with advanced data grid, dynamic filter dropdowns (Date Range, Status), search, and pagination UI.
- [x] 3.5 Implement `handleExportCsv` in `AdminReportsPage.tsx` using `Blob` to export current data with UTF-8 BOM.

## 4. UI Refinements & Global Optimizations

- [x] 4.1 Venue Map Editor: Fix double scrolling issues, move Media Upload to the right sidebar, and restructure the Schedule/Duration display.
- [x] 4.2 Accounts Page: Separate Avatar/Display Name and Email columns, apply JetBrains Mono font, remove horizontal borders, and replace 3-dot menus with hover actions.
- [x] 4.3 Dialogs & Toasts: Integrate `sonner` for global success toasts and rebuild Confirm Dialogs using Shadcn `AlertDialog` with Midnight Theme styling.
- [x] 4.4 Status Badges: Standardize concert status colors (Amber, Purple, Red, Gray) globally across components.
