# audience-notification-center

## Purpose
TBD - created by syncing change implement-audience-support-and-refunds.

## Requirements

### Requirement: Audience notification inbox
The system SHALL provide an authenticated audience notification center listing in-app notifications belonging to the current user.

#### Scenario: User opens notification center
- **WHEN** an authenticated `AUDIENCE` user opens the notification center
- **THEN** the system fetches their notifications from the audience inbox API and displays them sorted by newest first

#### Scenario: User has no notifications
- **WHEN** the authenticated user has no inbox notifications
- **THEN** the audience app displays an empty state with a link back to account or event discovery

### Requirement: Notification categories and deep links
The notification center SHALL classify notifications for purchase confirmations, reminders, payment failures, refund or support updates, and ticket-related messages.

#### Scenario: Notification has related resource
- **WHEN** a notification references an order, ticket, support request, or refund request
- **THEN** the notification item links to the relevant audience route

#### Scenario: Notification category is displayed
- **WHEN** a notification is rendered
- **THEN** the audience app displays a category label and visual treatment appropriate to the notification type

### Requirement: Notification read state
The system SHALL persist notification read state per authenticated user.

#### Scenario: User marks one notification as read
- **WHEN** the user marks a notification they own as read
- **THEN** the backend stores `readAt` and the item no longer contributes to unread count

#### Scenario: User marks all notifications as read
- **WHEN** the user clicks mark all as read
- **THEN** the backend marks all unread inbox notifications for that user as read

#### Scenario: User cannot mark another user's notification
- **WHEN** a user attempts to mark a notification they do not own
- **THEN** the backend returns `404` and does not change notification state

### Requirement: Notification inbox filters and counts
The system SHALL expose unread count and basic inbox filters for audience notifications.

#### Scenario: Account shell shows unread count
- **WHEN** the authenticated audience account shell loads
- **THEN** it can display the current unread notification count without fetching full notification detail

#### Scenario: User filters unread notifications
- **WHEN** the user selects the unread filter
- **THEN** the notification center displays only notifications with no `readAt` value

#### Scenario: User filters by category
- **WHEN** the user selects a notification category filter
- **THEN** the notification center displays only notifications in that category
