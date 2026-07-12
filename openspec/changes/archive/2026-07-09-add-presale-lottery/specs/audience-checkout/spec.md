## ADDED Requirements

### Requirement: Audience can register for a presale lottery from event detail
The audience web app SHALL show a lottery registration action for a lottery-enabled ticket type while its registration window is open and SHALL let an authenticated audience user register with a desired quantity.

#### Scenario: Open registration window shows register action
- **WHEN** a user views a published event with a lottery-enabled ticket type whose registration window is open
- **THEN** the app SHALL show a lottery registration action instead of presenting normal checkout as available

#### Scenario: Authenticated user registers
- **WHEN** an authenticated user submits a lottery registration for a ticket type
- **THEN** the app SHALL call the lottery register endpoint and display the user's lottery registration status

#### Scenario: Unauthenticated user is asked to log in
- **WHEN** an unauthenticated user clicks the lottery registration action
- **THEN** the app SHALL redirect to login with a return URL back to the event detail page

#### Scenario: Registration closed state
- **WHEN** a user views a lottery ticket type whose registration window has closed but whose draw has not completed
- **THEN** the app SHALL show a registration-closed state without offering registration or direct checkout

### Requirement: Audience can view lottery status and withdraw
The audience web app SHALL display the user's current lottery status for a ticket type and allow the user to withdraw an active registration before the draw runs.

#### Scenario: Registered status shown
- **WHEN** the user has an active registration for a ticket type and the draw has not run
- **THEN** the app SHALL display the registered status and the scheduled draw time returned by the backend

#### Scenario: Not-selected status shown
- **WHEN** the draw did not select the user
- **THEN** the app SHALL display a not-selected status and SHALL NOT offer entitlement checkout

#### Scenario: User withdraws registration
- **WHEN** the user withdraws before the draw
- **THEN** the app SHALL call the withdraw endpoint and update the ticket type state without creating a checkout order

### Requirement: Lottery winner can enter checkout
The audience web app SHALL let a user with an active `LOTTERY` purchase entitlement proceed to checkout for the won ticket type before the entitlement expires.

#### Scenario: Winner entitlement countdown shown
- **WHEN** the user has an active `LOTTERY` entitlement
- **THEN** the app SHALL display the entitlement expiry countdown and a checkout action for the won ticket type

#### Scenario: Entitlement submitted with checkout
- **WHEN** the user starts checkout from an active `LOTTERY` entitlement
- **THEN** the app SHALL include the entitlement identifier in the `POST /checkout/orders` request

#### Scenario: Entitlement expires before checkout
- **WHEN** the entitlement countdown reaches zero before order creation
- **THEN** the app SHALL disable entitlement checkout and refresh lottery status from the backend

### Requirement: Lottery checkout errors are user-facing
The audience web app SHALL map presale lottery checkout errors to Vietnamese user-facing messages and SHALL NOT treat them as generic unknown failures.

#### Scenario: Missing lottery entitlement error
- **WHEN** checkout is rejected because the ticket type requires a lottery entitlement during the presale window
- **THEN** the app SHALL show a message explaining that only draw winners can buy during the presale window

#### Scenario: Expired lottery entitlement error
- **WHEN** checkout is rejected because the `LOTTERY` entitlement expired
- **THEN** the app SHALL show a message explaining that the purchase window has expired and refresh lottery status

### Requirement: Audience web can expose temporary lottery operator controls for testing
The audience web app MAY expose a temporary operator/testing panel for organizer/admin users during this change so the team can test presale lottery end-to-end before the dedicated organizer admin UI exists. The panel SHALL call organizer/admin endpoints and SHALL NOT bypass backend authorization.

#### Scenario: Organizer tests manual draw from event detail
- **WHEN** an authenticated organizer/admin views a lottery-enabled event in the audience web test flow
- **THEN** the app MAY show controls to view registrations, update the lottery TTL before draw, and run the draw immediately
- **AND** after a manual draw completes, the app SHALL refresh lottery status and registration list data

#### Scenario: Audience user does not get operator controls
- **WHEN** a normal audience user views the same event
- **THEN** the app SHALL hide operator/testing controls and show only the audience lottery registration/status/checkout states
