## ADDED Requirements

### Requirement: Shared waiting-room section in concert edit
The web management app SHALL render one shared Virtual Waiting Room configuration section inside the existing admin and organizer concert edit pages. The section SHALL reuse the existing `FormSection` presentation, SHALL NOT create a separate route or tab, and SHALL keep waiting-room network and form behavior in `apps/web/src/features/concerts-shared/` rather than duplicating it between roles.

#### Scenario: Organizer opens waiting-room configuration
- **WHEN** an authenticated organizer opens `/organizer/concerts/:id/edit` for an owned editable concert
- **THEN** the page SHALL render the shared `Phòng chờ ảo` section for that concert
- **AND** the section SHALL call the existing `/organizer/waiting-room/:concertId` endpoint family

#### Scenario: Admin opens waiting-room configuration
- **WHEN** an authenticated admin opens `/admin/concerts/:id/edit`
- **THEN** the page SHALL render the same shared `Phòng chờ ảo` component
- **AND** it SHALL use the same waiting-room endpoint family rather than a new admin endpoint

#### Scenario: Waiting-room failure is isolated
- **WHEN** loading or mutating waiting-room configuration fails
- **THEN** the section SHALL show its own safe error or retry state
- **AND** the remaining concert edit fields SHALL retain their values and remain usable

#### Scenario: Waiting-room controls do not submit concert metadata
- **WHEN** a user activates a waiting-room action or presses Enter in a waiting-room numeric field
- **THEN** the section SHALL NOT submit the parent concert edit form
- **AND** it SHALL NOT render a nested form

### Requirement: Waiting-room configuration loading and local defaults
The waiting-room section SHALL parse successful responses with `WaitingRoomConfigResponseSchema`, SHALL distinguish an expected HTTP 404 through a typed status-bearing API error, and SHALL represent an authorized concert with no configuration as an unsaved local form using disabled backend-compatible defaults. It SHALL NOT write configuration merely because the component mounted or retried a read.

#### Scenario: Existing configuration loads
- **WHEN** GET waiting-room config returns HTTP 200 with a valid response
- **THEN** the section SHALL populate both its persisted snapshot and editable draft from the parsed response
- **AND** it SHALL display the persisted configuration panel

#### Scenario: Unconfigured concert uses safe defaults
- **WHEN** GET waiting-room config returns HTTP 404 after the role-specific concert detail loaded successfully
- **THEN** the section SHALL show an unsaved draft with `enabled=false`, `autoActivate=false`, `manualOverride=NONE`, `maxConcurrency=500`, `admissionTtlSeconds=600`, `activateThreshold=500`, `deactivateThreshold=100`, and `cooldownSeconds=60`
- **AND** it SHALL NOT call PUT until the operator explicitly selects `Lưu cấu hình`

#### Scenario: Non-404 read failure is retryable
- **WHEN** GET waiting-room config fails with a status other than 404 or returns a response that fails contract parsing
- **THEN** the section SHALL show a safe error and a retry action
- **AND** it SHALL NOT silently replace the failure with an unconfigured state

#### Scenario: Waiting-room cache is session scoped
- **WHEN** waiting-room data is queried for a concert
- **THEN** its query key SHALL distinguish authenticated role, JWT subject, and concert ID
- **AND** a mutation SHALL update or invalidate only the matching scoped entry

### Requirement: Waiting-room form validation and full save
The section SHALL provide controls for `enabled`, `autoActivate`, `manualOverride`, `maxConcurrency`, `admissionTtlSeconds`, `activateThreshold`, `deactivateThreshold`, and `cooldownSeconds`. It SHALL normalize numeric input before validating with `ConfigureWaitingRoomRequestSchema`, SHALL enforce the domain threshold relation, and SHALL send PUT only for a valid explicit save.

#### Scenario: Valid configuration is saved
- **WHEN** the operator explicitly saves a draft containing finite integers with `maxConcurrency >= 1`, `admissionTtlSeconds >= 1`, `activateThreshold >= 1`, `deactivateThreshold >= 0`, `cooldownSeconds >= 0`, and `activateThreshold > deactivateThreshold`
- **THEN** the section SHALL PUT the normalized full configuration
- **AND** a valid parsed response SHALL replace both persisted and draft snapshots

#### Scenario: Empty or non-integer input is rejected
- **WHEN** any numeric field is empty, non-finite, NaN, or fractional
- **THEN** the section SHALL show a field-level error
- **AND** it SHALL NOT call PUT

#### Scenario: Threshold relation is rejected
- **WHEN** `deactivateThreshold` is greater than or equal to `activateThreshold`
- **THEN** the section SHALL show an understandable error associated with the threshold fields
- **AND** it SHALL NOT call PUT

#### Scenario: Low concurrency shows a non-blocking warning
- **WHEN** `maxConcurrency` is a valid integer below 10
- **THEN** the section SHALL warn that the value is suitable only for demo or testing and may create long waits
- **AND** the warning SHALL NOT prevent an otherwise valid save

#### Scenario: Failed save preserves draft
- **WHEN** PUT fails or its success payload fails contract parsing
- **THEN** the section SHALL retain every user-entered draft value
- **AND** it SHALL show a safe actionable error without rendering a raw backend payload

### Requirement: Draft and immediate waiting-room override operations
The waiting-room section SHALL provide a segmented `Tự động / Bật ngay / Tắt ngay` draft control and separate immediate actions for `NONE`, `FORCE_ON`, and `FORCE_OFF`. The segmented control SHALL persist only through full save; immediate actions SHALL PATCH the persisted config without discarding unrelated unsaved draft fields.

#### Scenario: Segmented control changes draft only
- **WHEN** the operator changes the segmented operating-mode control
- **THEN** the section SHALL update only `draft.manualOverride`
- **AND** it SHALL not call PATCH or PUT until an explicit action is selected

#### Scenario: Quick actions require a persisted enabled config
- **WHEN** no configuration exists or the persisted configuration has `enabled=false`
- **THEN** all immediate override actions SHALL be disabled
- **AND** the section SHALL explain that the operator must enable and save configuration first

#### Scenario: Force-on is applied immediately
- **WHEN** an operator selects `Bật ngay` for a persisted enabled config
- **THEN** the section SHALL PATCH `{ "manualOverride": "FORCE_ON" }`
- **AND** it SHALL parse and display the returned persisted configuration

#### Scenario: Force-off and automatic mode are applied immediately
- **WHEN** an operator selects `Tắt ngay` or `Trả về tự động` for a persisted enabled config
- **THEN** the section SHALL PATCH `FORCE_OFF` or `NONE` respectively
- **AND** it SHALL prevent another override request until the current request completes

#### Scenario: Immediate override preserves unrelated draft edits
- **WHEN** a PATCH succeeds while concurrency, TTL, threshold, cooldown, or toggle draft fields differ from persisted values
- **THEN** the section SHALL replace the persisted snapshot from the response and synchronize only `draft.manualOverride`
- **AND** all other unsaved draft fields SHALL remain unchanged

### Requirement: Persisted waiting-room mode presentation
The section SHALL display `Cấu hình đã lưu và chế độ vận hành` from the persisted snapshot, SHALL visibly identify unsaved draft changes, and SHALL not claim that persisted auto-activation settings represent the current Redis runtime state.

#### Scenario: Persisted mode badge is derived safely
- **WHEN** the persisted configuration is rendered
- **THEN** no config or `enabled=false` SHALL show `Đang tắt`, enabled `FORCE_ON` SHALL show `Đang bật thủ công`, enabled `FORCE_OFF` SHALL show `Tắt khẩn cấp`, enabled `NONE` with auto-activation SHALL show `Tự động theo tải`, and enabled `NONE` without auto-activation SHALL show `Chờ bật thủ công`

#### Scenario: Automatic badge does not claim runtime activation
- **WHEN** the persisted mode is `Tự động theo tải`
- **THEN** the UI SHALL describe it as a configured operating mode
- **AND** it SHALL NOT infer current load, queue length, admitted count, or effective active state

#### Scenario: Unsaved changes are visible
- **WHEN** normalized draft configuration differs from the persisted snapshot or no config has yet been saved
- **THEN** the section SHALL display `Có thay đổi chưa lưu`

### Requirement: Accessible waiting-room management controls
Waiting-room toggles, segmented controls, numeric fields, status, errors, warnings, retry, save, and quick actions SHALL be keyboard operable and expose sufficient text and accessibility semantics without relying on color alone.

#### Scenario: Keyboard user operates the section
- **WHEN** a keyboard user navigates the waiting-room section
- **THEN** every interactive control SHALL have a visible focus state and an accessible name
- **AND** toggle and segmented-control state SHALL be programmatically exposed

#### Scenario: Field error is associated with its input
- **WHEN** a numeric field fails validation
- **THEN** its error text SHALL be associated with that input through accessible description semantics
- **AND** focus SHALL be able to remain in the section without submitting the parent concert form

#### Scenario: Status is not communicated by color alone
- **WHEN** persisted mode, warning, dirty state, loading, or error status is displayed
- **THEN** the UI SHALL include understandable text in addition to visual styling
