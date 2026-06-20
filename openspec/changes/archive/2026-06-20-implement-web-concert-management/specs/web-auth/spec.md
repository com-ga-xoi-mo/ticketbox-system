## MODIFIED Requirements

### Requirement: Redirect by role after sign-in

After a successful sign-in, the app SHALL route the user to a destination determined by their roles, applying a fixed precedence when a user holds more than one role: `ADMIN` outranks `ORGANIZER`. Organizers SHALL land on `/concerts` (the management surface); admins SHALL land on `/dashboard`. A user whose roles include neither `ADMIN` nor `ORGANIZER` (e.g. `CHECKIN_STAFF`, `AUDIENCE`) SHALL be routed to an access-denied destination rather than a portal page, to avoid a redirect loop.

#### Scenario: Organizer redirected to concerts

- **WHEN** sign-in succeeds and the decoded roles include `ORGANIZER` but not `ADMIN`
- **THEN** the app navigates to `/concerts`

#### Scenario: Admin precedence over organizer

- **WHEN** sign-in succeeds and the decoded roles include `ADMIN` (with or without `ORGANIZER`)
- **THEN** the app navigates to `/dashboard`

#### Scenario: User without a web role is denied

- **WHEN** sign-in succeeds but the decoded roles include neither `ADMIN` nor `ORGANIZER`
- **THEN** the app navigates to an access-denied page offering sign-out
- **AND** the user is NOT redirected back into `/login` (no loop)
