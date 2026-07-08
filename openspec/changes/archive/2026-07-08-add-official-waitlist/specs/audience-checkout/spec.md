## ADDED Requirements

### Requirement: Audience can join waitlist from sold-out ticket selection
The audience web app SHALL show an official waitlist action for primary-sale ticket types that are sold out or waitlist-gated and SHALL let an authenticated audience user join the waitlist.

#### Scenario: Sold-out primary ticket shows waitlist action
- **WHEN** a user views a published event with a sold-out primary-sale ticket type that supports official waitlist
- **THEN** the app SHALL show a waitlist action instead of presenting normal checkout as available

#### Scenario: Authenticated user joins waitlist
- **WHEN** an authenticated user joins the waitlist for a ticket type
- **THEN** the app SHALL call the waitlist join endpoint and display the user's waitlist status

#### Scenario: Unauthenticated user is asked to log in
- **WHEN** an unauthenticated user clicks the waitlist action
- **THEN** the app SHALL redirect to login with a return URL back to the event detail page

### Requirement: Audience can view and leave waitlist status
The audience web app SHALL display the user's current official waitlist status for a ticket type and allow the user to leave while the entry or entitlement is still active.

#### Scenario: Waiting status shown
- **WHEN** the user has an active waiting entry for a ticket type
- **THEN** the app SHALL display the waiting status and approximate queue position returned by the backend

#### Scenario: User leaves waitlist
- **WHEN** the user leaves the waitlist from the event detail or checkout-related surface
- **THEN** the app SHALL call the leave endpoint and update the ticket type state without creating a checkout order

### Requirement: Entitled user can enter checkout
The audience web app SHALL let a user with an active official waitlist entitlement proceed to checkout for the granted ticket type before the entitlement expires.

#### Scenario: Entitlement countdown shown
- **WHEN** the user has an active waitlist entitlement
- **THEN** the app SHALL display the entitlement expiry countdown and a checkout action for the granted ticket type

#### Scenario: Entitlement submitted with checkout
- **WHEN** the user starts checkout from an active waitlist entitlement
- **THEN** the app SHALL include the entitlement identifier in the `POST /checkout/orders` request

#### Scenario: Entitlement expires before checkout
- **WHEN** the entitlement countdown reaches zero before order creation
- **THEN** the app SHALL disable entitlement checkout and refresh waitlist status from the backend

### Requirement: Waitlist checkout errors are user-facing
The audience web app SHALL map official waitlist checkout errors to Vietnamese user-facing messages and SHALL not treat them as generic unknown failures.

#### Scenario: Missing entitlement error
- **WHEN** checkout is rejected because the ticket type requires an official waitlist entitlement
- **THEN** the app SHALL show a message explaining that the user must wait for their purchase turn

#### Scenario: Expired entitlement error
- **WHEN** checkout is rejected because the entitlement expired
- **THEN** the app SHALL show a message explaining that the purchase window has expired and refresh waitlist status
