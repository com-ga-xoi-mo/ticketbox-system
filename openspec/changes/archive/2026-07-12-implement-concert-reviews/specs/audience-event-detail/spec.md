## ADDED Requirements

### Requirement: Event detail displays concert reviews
The audience event detail page SHALL display the concert's visible review summary and visible review list.

#### Scenario: Concert has visible reviews
- **WHEN** the event detail page loads a concert whose review API returns visible reviews
- **THEN** the page SHALL display the average rating, review count, and visible review comments

#### Scenario: Concert has no visible reviews
- **WHEN** the event detail page loads a concert with no visible reviews
- **THEN** the page SHALL display an empty review state without breaking the existing ticket purchase layout

#### Scenario: Hidden reviews are not displayed
- **WHEN** the review API does not return hidden reviews
- **THEN** the page SHALL NOT render hidden review content

### Requirement: Eligible audience can manage own concert review
The audience event detail page SHALL show review creation controls only when the authenticated user is eligible to review the concert. If the user already has a review, the page SHALL show edit and delete controls for that review.

#### Scenario: Eligible user sees review form
- **WHEN** an authenticated user with an `ISSUED` ticket for the concert opens the event detail page and has not reviewed it yet
- **THEN** the page SHALL show a rating and comment form for that concert

#### Scenario: Ineligible user does not see review form
- **WHEN** a user without an `ISSUED` ticket for the concert opens the event detail page
- **THEN** the page SHALL NOT allow that user to submit a review

#### Scenario: Existing reviewer can edit review
- **WHEN** an authenticated user who already reviewed the concert opens the event detail page
- **THEN** the page SHALL show controls to update that user's rating or comment

#### Scenario: Existing reviewer can delete review
- **WHEN** an authenticated user who already reviewed the concert opens the event detail page
- **THEN** the page SHALL show a control to delete that user's review

#### Scenario: Review mutation refreshes public summary
- **WHEN** the user creates, updates, or deletes their review
- **THEN** the page SHALL refresh the review list and aggregate rating displayed for the concert
