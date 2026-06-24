## MODIFIED Requirements

### Requirement: QR scan UI foundation

The mobile app SHALL provide a QR scan UI foundation that acquires decoded QR payloads from the device camera, requests and reflects camera-permission state before scanning, prevents duplicate local submissions while one scan is in flight or its result is displayed, validates successful API responses using the shared online scan contract, and renders clear local scan result states. The UI SHALL NOT provide a manual free-text QR payload entry field as a scan input source.

#### Scenario: Scanner opens with selected assignment

- **WHEN** staff opens the scanner with an active selected assignment and camera permission already granted
- **THEN** the app SHALL show the scanner-ready state for that assignment with the live camera preview active

#### Scenario: Camera permission is requested before scanning

- **WHEN** staff opens the scanner and camera permission status is undetermined
- **THEN** the app SHALL present a permission request action, SHALL NOT activate barcode decoding until permission is granted, and SHALL NOT expose a manual payload-entry fallback

#### Scenario: Denied camera permission is recoverable

- **WHEN** camera permission has been denied
- **THEN** the app SHALL show a recoverable permission-blocked state explaining the camera is required, SHALL NOT activate scanning or accept any scan input, and SHALL offer a way to re-request or open system settings

#### Scenario: Decoded camera QR starts online submission

- **WHEN** the camera decodes a QR barcode while the scan workflow is `ready` and no scan submission is in flight
- **THEN** the app SHALL create a shared online scan request containing the selected assignment, concert context, the decoded QR payload, device ID, and scan timestamp

#### Scenario: Stable installation identifier is included

- **WHEN** the app starts or first initializes the scan workflow
- **THEN** the app and scan workflow SHALL begin in `initializing`, await a mobile-local `getOrCreateInstallationId(): Promise<string>` provider backed by Expo SecureStore, enter scanner-ready state only after it resolves, and include the resolved stable non-empty installation-scoped `deviceId` in every online scan request

#### Scenario: Existing installation identifier is reused

- **WHEN** the dedicated SecureStore installation-ID key contains a valid identifier
- **THEN** the provider SHALL return that value unchanged across app restarts and user logout/login without deriving it from a user account or hardware serial number

#### Scenario: Missing installation identifier is created once

- **WHEN** the dedicated SecureStore installation-ID key is missing or contains an invalid value
- **THEN** the provider SHALL create a random UUID, persist it successfully, and return the persisted value without using a fixed fallback constant

#### Scenario: Missing installation identifier blocks submission

- **WHEN** the app cannot read, generate, or persist a valid installation identifier, or initialization has not completed
- **THEN** it SHALL not display scanner-ready state, SHALL disable scan submission, SHALL expose a recoverable local error, and SHALL NOT send an online scan request or mark the ticket accepted locally

#### Scenario: Installation initialization can be retried

- **WHEN** installation-ID initialization previously failed and staff selects the retry action
- **THEN** the app SHALL call the asynchronous scan-workflow initialization again, show `initializing` while it runs, enter `ready` only on success, and SHALL NOT use a state-only reset as the retry operation

#### Scenario: Duplicate camera decode is ignored while submitting or showing a result

- **WHEN** the camera emits another barcode decode event while the previous scan submission is still in flight or its result is still displayed
- **THEN** the app SHALL suspend camera barcode handling and ignore or debounce the repeated decode event until staff resets to scan another ticket

#### Scenario: Business scan result is displayed

- **WHEN** the check-in API returns a valid `accepted`, `duplicate`, `invalid`, or `unassigned` business response
- **THEN** the app SHALL map it to the corresponding local result presentation

#### Scenario: Authorization and transport outcomes remain local

- **WHEN** online scan receives HTTP `401` or `403`, a network failure, or an unavailable service response
- **THEN** the app SHALL classify `401`/`403` by HTTP status before success-schema parsing, map the outcome to local `unauthorized`, `network-error`, or `unavailable` state, and SHALL NOT add those values or an authorization error body schema to the shared API business result contract

#### Scenario: Authorization error body is parsed tolerantly

- **WHEN** a `401` or `403` response includes the existing NestJS error body
- **THEN** the mobile client MAY extract optional display text from a `message` string or string array, but the local `unauthorized` mapping SHALL NOT depend on an exact body shape
