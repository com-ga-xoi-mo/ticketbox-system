## ADDED Requirements

### Requirement: PDF press kit upload
The system SHALL allow organizers to upload PDF artist profiles or concert press kits for a concert.

#### Scenario: Organizer uploads valid PDF
- **WHEN** an organizer uploads a valid PDF for a concert they manage
- **THEN** the system SHALL store the file and create an artist bio processing job

#### Scenario: Invalid file type is rejected
- **WHEN** an organizer uploads a non-PDF file as a press kit
- **THEN** the system SHALL reject the upload

### Requirement: Artist bio generation
The system SHALL extract text from uploaded PDFs, clean the text, and send it through an AI adapter to generate a concise artist bio.

#### Scenario: Bio generation succeeds
- **WHEN** the worker processes a readable PDF
- **THEN** the system SHALL save the generated artist bio for organizer review or publication

#### Scenario: AI provider fails
- **WHEN** the AI provider adapter fails
- **THEN** the system SHALL mark the job as failed with an error reason and SHALL allow retry

### Requirement: Artist bio publication
The system SHALL display the approved generated artist bio on the public concert detail page.

#### Scenario: Approved bio is public
- **WHEN** an organizer approves a generated artist bio
- **THEN** the public concert detail page SHALL include that bio

