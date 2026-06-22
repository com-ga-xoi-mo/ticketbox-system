## ADDED Requirements

### Requirement: Public concert detail published artist bio
The system SHALL include an approved artist bio on the public concert detail response only after organizer publication.

#### Scenario: Published artist bio is returned on public concert detail
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has an approved artist bio
- **THEN** the system SHALL include the published artist bio text in the concert detail response

#### Scenario: Unapproved generated artist bio is hidden from public concert detail
- **WHEN** an audience user opens the public detail page for a concert whose latest artist bio job is draft, processing, failed, or ready for review
- **THEN** the system SHALL NOT include that unapproved generated bio, processing state, or error details in the public concert detail response

#### Scenario: Concert detail still works without artist bio
- **WHEN** an audience user opens the public detail page for a concert without a published artist bio
- **THEN** the system SHALL return the normal concert detail response with the artist bio field omitted or set to null
