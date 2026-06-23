## ADDED Requirements

### Requirement: Notification delivery lint gate compliance
The notification delivery test and support code SHALL satisfy the repository ESLint gate without changing notification delivery runtime behavior.

#### Scenario: Notification support code passes lint
- **WHEN** the repository lint command runs after this change is implemented
- **THEN** notification delivery test doubles, support adapters, and processor specs SHALL not report unused-parameter or type-only import ESLint errors

#### Scenario: Notification behavior remains unchanged
- **WHEN** the notification delivery regression tests run after the lint cleanup
- **THEN** purchase confirmation creation, email delivery retry behavior, and notification processor behavior SHALL continue to pass without queue contract, email behavior, database schema, API surface, or mobile app changes
