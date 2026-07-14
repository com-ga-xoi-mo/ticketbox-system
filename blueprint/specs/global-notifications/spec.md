## ADDED Requirements

### Requirement: Global Toast Notifications
The system SHALL provide global, non-blocking toast notifications for successful actions.

#### Scenario: User performs a successful action
- **WHEN** a user successfully completes a form or action (e.g., login, save concert)
- **THEN** a toast notification appears confirming the action.

### Requirement: Standardized Confirmation Dialogs
The system SHALL use a standardized modal dialog to confirm destructive or sensitive actions.

#### Scenario: User attempts a sensitive action
- **WHEN** a user clicks to cancel a concert, archive a ticket type, or revoke access
- **THEN** an AlertDialog appears requiring explicit confirmation before proceeding.
