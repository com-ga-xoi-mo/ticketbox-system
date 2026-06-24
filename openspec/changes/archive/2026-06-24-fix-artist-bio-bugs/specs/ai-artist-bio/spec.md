## MODIFIED Requirements

### Requirement: Organizer review and publication
The system SHALL require organizer review before a generated artist bio becomes public.

#### Scenario: Generated bio becomes ready for review
- **WHEN** PDF extraction and AI generation succeed
- **THEN** the system SHALL persist the generated bio and mark the artist bio record as ready for organizer review

#### Scenario: Organizer approves generated bio
- **WHEN** an organizer approves a ready-for-review generated bio for a concert they own
- **THEN** the system SHALL mark the bio as published, persist the public bio text, reviewer, and publication timestamp

#### Scenario: Organizer rejects generated bio
- **WHEN** an organizer rejects a ready-for-review generated bio for a concert they own
- **THEN** the system SHALL mark the bio as rejected, keeping it for historical record without publishing it

#### Scenario: Organizer cannot approve another organizer's bio
- **WHEN** an organizer attempts to approve an artist bio for a concert they do not own
- **THEN** the system SHALL reject the action and SHALL NOT publish the bio

#### Scenario: Failed bio cannot be published
- **WHEN** an organizer attempts to publish a failed or processing artist bio job
- **THEN** the system SHALL reject the action with a status transition error
