## MODIFIED Requirements

### Requirement: Functional ticket quantity selector
The event detail page SHALL manage ticket quantity selection as local state with validation against availability and per-user limits. When the user confirms their selection, the page SHALL navigate to the checkout flow passing the selected ticket types and quantities, gated behind authentication.

#### Scenario: Incrementing ticket quantity
- **WHEN** a user clicks the "+" button on an active ticket type
- **THEN** the quantity for that ticket type increments by 1
- **AND** the displayed quantity updates immediately

#### Scenario: Quantity respects maximum per user
- **WHEN** the quantity for a ticket type reaches its `maxPerUser` value
- **THEN** the "+" button is disabled for that ticket type

#### Scenario: Quantity respects available stock
- **WHEN** the quantity for a ticket type reaches its `availableQuantity`
- **THEN** the "+" button is disabled for that ticket type

#### Scenario: Decrementing ticket quantity
- **WHEN** a user clicks the "-" button on a ticket type with quantity > 0
- **THEN** the quantity decrements by 1

#### Scenario: Quantity cannot go below zero
- **WHEN** a ticket type has quantity of 0
- **THEN** the "-" button is disabled for that ticket type

#### Scenario: Checkout button navigates to checkout flow
- **WHEN** the user clicks "Tiếp tục mua vé" with at least one ticket type having quantity > 0
- **THEN** the page SHALL navigate to the checkout page passing the concert ID and selected ticket type quantities as state
- **AND** if the user is not authenticated, the page SHALL redirect to `/login?returnTo=/events/:slug` instead

#### Scenario: Checkout button is disabled without selection
- **WHEN** no ticket types have quantity > 0
- **THEN** the "Tiếp tục mua vé" button SHALL be disabled
