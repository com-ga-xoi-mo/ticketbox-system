## MODIFIED Requirements

### Requirement: Audience can join waitlist from sold-out ticket selection
The audience web app SHALL show an official waitlist action ("Báo tôi khi có vé") for a primary-sale ticket type only when it is currently sold out, and SHALL let an authenticated audience user subscribe to a return-to-sale notification. The action SHALL NOT present the waitlist as a purchase priority or reserved slot.

#### Scenario: Sold-out primary ticket shows notify action
- **WHEN** a user views a published event with a sold-out primary-sale ticket type that supports official waitlist
- **THEN** the app SHALL show a "báo khi có vé" action instead of presenting normal checkout as available

#### Scenario: Authenticated user subscribes
- **WHEN** an authenticated user joins the waitlist for a ticket type
- **THEN** the app SHALL call the waitlist join endpoint and display the user's subscribed status

#### Scenario: Unauthenticated user is asked to log in
- **WHEN** an unauthenticated user clicks the notify action
- **THEN** the app SHALL redirect to login with a return URL back to the event detail page

### Requirement: Audience can view and leave waitlist status
The audience web app SHALL display whether the user is subscribed to the official waitlist for a ticket type and allow the user to leave. It SHALL NOT display any entitlement, priority slot, queue position, or expiry, because the waitlist grants none.

#### Scenario: Subscribed status shown
- **WHEN** the user has an active waitlist subscription for a ticket type
- **THEN** the app SHALL display a subscribed status ("Bạn sẽ được thông báo khi vé quay lại") without any slot, position, or countdown

#### Scenario: User leaves waitlist
- **WHEN** the user leaves the waitlist from the event detail surface
- **THEN** the app SHALL call the leave endpoint and update the ticket type state without creating a checkout order

### Requirement: Lottery winner can enter checkout
The audience web app SHALL let a lottery winner proceed to checkout for the won ticket type at any time while the presale window is open, showing the remaining quantity they may buy. It SHALL NOT display an entitlement countdown or submit any entitlement identifier.

#### Scenario: Winner sees remaining purchasable quantity
- **WHEN** the user is a lottery winner for a ticket type whose presale window is open
- **THEN** the app SHALL show that the user may buy during the presale window and the remaining quantity, with a checkout action

#### Scenario: Winner checkout submits an ordinary order
- **WHEN** the winner starts checkout during the presale window
- **THEN** the app SHALL submit an ordinary `POST /checkout/orders` request without any entitlement identifier

#### Scenario: Winner status refreshes after purchase
- **WHEN** the winner completes a purchase for part of their won quantity
- **THEN** the app SHALL refresh lottery status and reflect the reduced remaining quantity

### Requirement: Lottery checkout errors are user-facing
The audience web app SHALL map presale lottery checkout errors to Vietnamese user-facing messages and SHALL NOT treat them as generic unknown failures.

#### Scenario: Non-winner during presale error
- **WHEN** checkout is rejected because the ticket type is in its presale window and the user is not a winner
- **THEN** the app SHALL show a message explaining that only draw winners can buy during the presale window

#### Scenario: Won quantity exceeded error
- **WHEN** checkout is rejected because the winner has already bought their full won quantity
- **THEN** the app SHALL show a message explaining they have used their winning allotment and refresh lottery status

## REMOVED Requirements

### Requirement: Entitled user can enter checkout
**Reason**: The waitlist no longer grants a purchase entitlement or a timed checkout slot, so there is no waitlist entitlement countdown or entitlement-backed checkout in the audience app.
**Migration**: Remove the waitlist entitlement countdown UI and the `waitlistEntitlementId` submission; the waitlist surface becomes subscribe/notify only.

### Requirement: Waitlist checkout errors are user-facing
**Reason**: The waitlist no longer gates checkout, so checkout cannot be rejected for a missing or expired waitlist entitlement.
**Migration**: Remove the waitlist checkout error mappings; recovered tickets are bought through the ordinary public checkout path.
