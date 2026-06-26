## ADDED Requirements

### Requirement: Toggle Concert Favorite Status
The system SHALL allow authenticated Audience users to toggle the favorite status of a concert.

#### Scenario: User favorites an unfavorited concert
- **WHEN** user requests to favorite a concert that is not currently favorited
- **THEN** the system adds the concert to the user's favorites
- **AND** returns status indicating it is now favorited

#### Scenario: User unfavorites a favorited concert
- **WHEN** user requests to favorite a concert that is already favorited
- **THEN** the system removes the concert from the user's favorites
- **AND** returns status indicating it is no longer favorited

### Requirement: List Favorited Concerts
The system SHALL allow authenticated Audience users to retrieve a list of all concerts they have favorited.

#### Scenario: User views their favorites
- **WHEN** user requests their list of favorite concerts
- **THEN** the system returns a list of concerts ordered by when they were favorited (newest first)
- **AND** each item includes basic concert info (title, startsAt, venueName, posterUrl) and the favorited timestamp

### Requirement: Check Favorite Status
The system SHALL allow authenticated Audience users to check if a specific concert is favorited.

#### Scenario: User checks a favorited concert
- **WHEN** user requests the favorite status of a concert they have favorited
- **THEN** the system returns true

#### Scenario: User checks an unfavorited concert
- **WHEN** user requests the favorite status of a concert they have not favorited
- **THEN** the system returns false
