## MODIFIED Requirements

### Requirement: Sidebar configuration filtered by role
The shell SHALL derive sidebar items from a single declarative `sidebar-config`, where each item lists the roles allowed to see it, and render only the items whose allowed roles include the current user's role. The admin account-management item SHALL be ADMIN-only, the organizer self-account item SHALL be ORGANIZER-only, and assignment item SHALL be ADMIN-only. Sidebar item paths SHALL point to role-prefixed routes for admin and organizer destinations.

#### Scenario: Organizer sees only permitted items
- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar shows organizer Dashboard, Concerts, Venue Maps, and Account
- **AND** the Account item links to `/organizer/account`
- **AND** the sidebar does NOT show admin Accounts or Assignments

#### Scenario: Admin sees admin-only items
- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar shows Dashboard, Reports, Concerts, Venue Maps, Assignments, and Accounts
- **AND** the Dashboard item links to `/admin/dashboard`
- **AND** the Concerts item links to `/admin/concerts`
- **AND** the Accounts item links to `/admin/accounts`
- **AND** the Assignments item links to `/admin/assignments`

#### Scenario: Filter is data-driven
- **WHEN** a new item is added to `sidebar-config` with a `roles` list
- **THEN** it appears in the sidebar for exactly those roles without changes to the rendering component

## ADDED Requirements

### Requirement: Console top navbar uses profile identity
The console top navbar SHALL render the authenticated user's display name, email, and avatar from `GET /me/profile` when a session exists.

#### Scenario: Console profile has avatar
- **WHEN** the current console user's profile includes `avatarUrl`
- **THEN** the top navbar avatar uses that URL

#### Scenario: Console profile has no avatar
- **WHEN** the current console user's profile has no avatar URL
- **THEN** the top navbar displays initials or a consistent fallback avatar

### Requirement: Console avatar dropdown exposes account actions
The console top navbar avatar dropdown SHALL provide actions for Account, Change Password, and Logout. Change Password SHALL navigate to the current role's self-account page with `section=password`.

#### Scenario: Admin opens avatar menu
- **WHEN** an ADMIN opens the top navbar avatar dropdown
- **THEN** the menu includes Account, Change Password, and Logout
- **AND** Account navigates to `/admin/account`
- **AND** Change Password navigates to `/admin/account?section=password`

#### Scenario: Organizer opens avatar menu
- **WHEN** an ORGANIZER opens the top navbar avatar dropdown
- **THEN** the menu includes Account, Change Password, and Logout
- **AND** Account navigates to `/organizer/account`
- **AND** Change Password navigates to `/organizer/account?section=password`
