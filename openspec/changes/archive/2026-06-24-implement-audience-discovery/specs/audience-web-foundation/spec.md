## MODIFIED Requirements

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

#### Scenario: Additional shadcn primitives for discovery surfaces
- **WHEN** discovery pages need tabs, select dropdowns, popovers, or dialog components
- **THEN** the app installs and configures the required shadcn/ui primitives (`tabs`, `select`, `popover`, `dialog`) in `components/ui/`
- **AND** only primitives actively used by discovery surfaces are added

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

#### Scenario: Extended page states for discovery
- **WHEN** discovery pages encounter no-results, sold-out, or unavailable states
- **THEN** the app renders context-specific state components that extend the existing `PageStates` module
- **AND** each state includes an actionable next step (clear filters, browse other events, go back)

#### Scenario: Typography and tokens are defined
- **WHEN** the audience app renders public and account pages
- **THEN** colors, spacing, radius, typography, focus states, and responsive constraints come from the app's token baseline rather than one-off inline styling

#### Scenario: UI implementation uses relevant skills and guidelines
- **WHEN** implementation starts on Ant Design or shadcn-style components
- **THEN** the implementer reads and applies the relevant Ant Design and shadcn skill guidance before coding those components
- **AND** UI completion includes a web design guideline or accessibility review before the design-system tasks are marked complete
