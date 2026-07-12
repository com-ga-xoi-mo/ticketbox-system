## ADDED Requirements

### Requirement: Audience sees the waiting room when a concert's sale is throttled
The audience web app SHALL show a waiting-room experience when a user attempts to buy for a concert whose waiting room is active, letting the user join the queue and see their live position.

#### Scenario: App checks waiting-room status before checkout
- **WHEN** an authenticated user attempts to continue to checkout for a concert
- **THEN** the app SHALL check the concert's waiting-room status before submitting `POST /checkout/orders`
- **AND** it SHALL route the user to the waiting-room view when the room is active and the user is not admitted

#### Scenario: User enters the waiting room on checkout attempt
- **WHEN** an authenticated user attempts to check out for a concert whose waiting room is active and holds no admission token
- **THEN** the app SHALL place the user in the waiting-room view instead of the normal checkout and SHALL show the user's position

#### Scenario: Direct checkout when the room is inactive
- **WHEN** a user attempts to check out for a concert whose waiting room is inactive
- **THEN** the app SHALL proceed to normal checkout without a waiting-room step

### Requirement: Live position updates via SSE
The audience web app SHALL subscribe to the waiting-room SSE stream using a minted stream token and SHALL update the displayed position and status in real time.

#### Scenario: Position updates live
- **WHEN** the user is in the waiting-room view
- **THEN** the app SHALL open the SSE stream with a minted stream token and SHALL update the shown position as the backend pushes updates

#### Scenario: Admission advances the user to checkout
- **WHEN** the SSE stream reports the user has been admitted
- **THEN** the app SHALL move the user to checkout and SHALL include the admission token as `waitingRoomAdmissionToken` in the `POST /checkout/orders` request

#### Scenario: Stream token is minted for the selected concert
- **WHEN** the user enters a waiting-room view for a concert
- **THEN** the app SHALL mint and use a stream token for that specific concert

#### Scenario: User can leave the queue
- **WHEN** the user chooses to leave the waiting room
- **THEN** the app SHALL call the leave endpoint and stop the SSE subscription

### Requirement: Waiting room errors are user-facing
The audience web app SHALL map waiting-room checkout errors to Vietnamese user-facing messages and SHALL NOT treat them as generic unknown failures.

#### Scenario: Missing admission error returns the user to the queue
- **WHEN** checkout is rejected because the concert's waiting room is active and the user has no valid admission token
- **THEN** the app SHALL show a message explaining the user must wait in the queue and SHALL return the user to the waiting-room view

#### Scenario: Expired admission error
- **WHEN** checkout is rejected because the admission token expired
- **THEN** the app SHALL show a message that the admission window expired and SHALL re-join or refresh the queue position
