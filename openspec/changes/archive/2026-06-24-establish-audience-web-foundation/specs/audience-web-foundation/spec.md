## ADDED Requirements

### Requirement: Separate audience web workspace app
The system SHALL provide a separate audience-facing web app at `apps/audience-web` and SHALL keep the existing organizer/admin `apps/web` behavior unchanged.

#### Scenario: Audience app is a sibling workspace
- **WHEN** the workspace packages are installed or verified
- **THEN** `apps/audience-web` is treated as its own npm workspace package
- **AND** it does not replace or rename `apps/web`

#### Scenario: Organizer portal behavior is unchanged
- **WHEN** the existing `apps/web` verification suite runs after the audience app foundation is added
- **THEN** the existing organizer/admin routing, role redirects, and protected route behavior continue to pass without requiring audience app code

### Requirement: Public audience routing and layout
The audience web app SHALL provide a responsive public app shell for audience browsing, with routes for the public home experience, event discovery, event details, and authentication entry points.

#### Scenario: Public visitor can browse audience routes
- **WHEN** an unauthenticated visitor opens the audience app home, event listing, or event detail route
- **THEN** the route renders inside the public audience layout without requiring a session

#### Scenario: Public layout adapts across viewports
- **WHEN** the public layout is rendered on mobile and desktop viewport widths
- **THEN** navigation, content regions, cards, and primary actions fit within their containers without overlapping or clipping text

#### Scenario: Unknown public route has a polished fallback
- **WHEN** a visitor opens an unknown audience route
- **THEN** the app renders a production-quality not-found state with navigation back to the audience browsing surface

### Requirement: Audience authenticated route boundary
The audience web app SHALL protect account-oriented routes so that they require an authenticated session whose roles include `AUDIENCE`. Customer-facing UI and authorization logic MUST use the existing `AUDIENCE` role and MUST NOT introduce a `CUSTOMER` role.

#### Scenario: Audience user accesses protected audience route
- **WHEN** an authenticated user whose decoded token roles include `AUDIENCE` opens an audience account route
- **THEN** the app renders the protected route content

#### Scenario: Unauthenticated visitor is redirected to login
- **WHEN** a visitor without a session opens an audience account route
- **THEN** the app redirects the visitor to the audience login route
- **AND** preserves the intended destination for post-login navigation when practical

#### Scenario: Non-audience authenticated user is denied
- **WHEN** an authenticated user whose decoded token roles do not include `AUDIENCE` opens an audience protected route
- **THEN** the app renders an access-denied state with a sign-out action
- **AND** it does not route the user into the organizer/admin portal automatically

#### Scenario: No customer role is introduced
- **WHEN** audience app role constants, route guards, shared API contract usage, and tests are inspected
- **THEN** they refer to `AUDIENCE` for customer access
- **AND** they do not define or require a `CUSTOMER` role

### Requirement: Audience auth session handling
The audience web app SHALL authenticate through the backend `POST /auth/login` endpoint, store the returned access token, restore sessions from storage, and clear invalid sessions through centralized handling.

#### Scenario: Successful audience login establishes session
- **WHEN** a user submits valid credentials on the audience login route
- **THEN** the app calls `POST /auth/login`
- **AND** stores the returned access token
- **AND** establishes a session from the decoded token roles

#### Scenario: Audience login rejects invalid credentials
- **WHEN** the backend rejects an audience login attempt with `401`
- **THEN** the app shows an inline or form-level invalid-credentials error
- **AND** no session is established

#### Scenario: Stored token is restored on startup
- **WHEN** the app starts and a decodable access token exists in browser storage
- **THEN** the app restores the session state from the token subject and roles

#### Scenario: Malformed stored token is discarded
- **WHEN** the app starts and the stored token cannot be decoded into a usable session
- **THEN** the app clears the stored token
- **AND** treats the visitor as signed out

### Requirement: Audience API client and query provider
The audience web app SHALL centralize backend access through an environment-configured API client and SHALL provide TanStack Query as the standard data-fetching layer.

#### Scenario: API base URL comes from environment
- **WHEN** the audience app sends an API request
- **THEN** the request URL is based on the audience app environment configuration
- **AND** local development has a documented default or `.env.example` value

#### Scenario: Authenticated requests include bearer token
- **WHEN** an API request is made while an access token exists
- **THEN** the request includes `Authorization: Bearer <token>`

#### Scenario: Unauthorized response clears session
- **WHEN** an audience API response returns `401`
- **THEN** the API client clears the stored session
- **AND** the app moves the user to the audience login boundary

#### Scenario: Query client wraps app routes
- **WHEN** any audience route component uses TanStack Query hooks
- **THEN** the app has a single configured query client provider above the route tree

### Requirement: Audience design system baseline
The audience web app SHALL define a modern, polished, responsive design baseline that prioritizes Ant Design components, uses shadcn/Radix-style owned local components for TicketBox-branded primitives, uses Tailwind CSS v4 for token and layout infrastructure, and limits Tailwind utility usage to layout composition and responsive constraints.

#### Scenario: Ant Design is preferred for mature controls
- **WHEN** audience pages need mature controls such as forms, inputs, selects, date pickers, modals, drawers, dropdowns, menus, tabs, pagination, skeletons, empty states, alerts, notifications, or data-heavy widgets
- **THEN** the app uses documented Ant Design components by default
- **AND** the app themes them through supported provider, token, `classNames`, or `styles` APIs rather than broad global `.ant-*` selector overrides

#### Scenario: shadcn-style primitives own brand-specific surfaces
- **WHEN** audience pages need TicketBox-specific primitives such as event cards, ticket cards, section shells, branded buttons, badges, dialog wrappers, or page states
- **THEN** the app provides local owned components following shadcn/Radix-style composition and accessibility patterns
- **AND** those components are customized in the source tree rather than treated as opaque third-party widgets

#### Scenario: Tailwind is not the primary component styling strategy
- **WHEN** audience UI components are implemented
- **THEN** Tailwind CSS v4 utilities are limited to layout, spacing, responsive wrappers, and small composition helpers
- **AND** reusable controls are built from Ant Design components or local shadcn-style owned components instead of large one-off Tailwind class blocks

#### Scenario: Tailwind v4 is isolated to the audience app
- **WHEN** Tailwind is configured for `apps/audience-web`
- **THEN** the app uses Tailwind CSS v4-compatible configuration and import patterns
- **AND** the existing organizer/admin `apps/web` Tailwind setup is not migrated or changed as part of this foundation

#### Scenario: Baseline states are available
- **WHEN** data-dependent audience pages are loading, empty, or failed
- **THEN** the app renders reusable loading, empty, and error states that match the audience design baseline
- **AND** those states use Ant Design primitives where they fit or local shadcn-style page-state wrappers where brand expression is needed

#### Scenario: Typography and tokens are defined
- **WHEN** the audience app renders public and account pages
- **THEN** colors, spacing, radius, typography, focus states, and responsive constraints come from the app's token baseline rather than one-off inline styling

#### Scenario: UI implementation uses relevant skills and guidelines
- **WHEN** implementation starts on Ant Design or shadcn-style components
- **THEN** the implementer reads and applies the relevant Ant Design and shadcn skill guidance before coding those components
- **AND** UI completion includes a web design guideline or accessibility review before the design-system tasks are marked complete

### Requirement: Audience workspace commands
The workspace SHALL expose scripts for developing, building, typechecking, testing, and verifying the audience web app without changing existing organizer/admin scripts.

#### Scenario: Audience app can run in development
- **WHEN** a developer runs the audience web development script from the workspace root
- **THEN** the `apps/audience-web` Vite dev server starts using the audience app configuration

#### Scenario: Audience app can be verified
- **WHEN** a developer runs the audience web verification script from the workspace root
- **THEN** the app typecheck and test checks run for `apps/audience-web`

#### Scenario: Existing web scripts still target organizer portal
- **WHEN** a developer runs the existing `dev:web` or `verify:web` root scripts
- **THEN** those scripts continue to target `@ticketbox/web`
- **AND** they do not start or verify `@ticketbox/audience-web`

### Requirement: Existing backend and shared packages are reused
The audience web app SHALL reuse existing backend APIs and shared packages where available, and SHALL add only minimal backend or shared contract support required for the foundation.

#### Scenario: Public catalog uses existing backend routes
- **WHEN** the audience app reads public event catalog data for foundation pages
- **THEN** it uses existing public concert catalog routes before introducing new backend endpoints

#### Scenario: Auth uses existing backend route
- **WHEN** the audience app authenticates a user
- **THEN** it uses the existing `POST /auth/login` backend route

#### Scenario: Shared contracts are preferred over app-local wire types
- **WHEN** an audience API response has a contract exported by `@ticketbox/api-types`
- **THEN** the audience app validates or types the response through that shared contract instead of duplicating the wire type locally

#### Scenario: Backend additions are minimal
- **WHEN** the foundation needs behavior missing from the backend or shared contracts
- **THEN** the implementation adds only the smallest endpoint, mapper, schema, or export needed by the audience app foundation
