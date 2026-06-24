# ai-artist-bio Specification

## Purpose

Define how TicketBox validates PDF artist press kits, processes them through an AI bio generation workflow, stores durable processing state, and publishes only organizer-approved artist bios to public concert detail.

## Requirements

### Requirement: Press kit PDF validation and storage
The system SHALL validate organizer press kit uploads before storage and SHALL persist accepted PDF files through the project asset/object-storage abstraction.

#### Scenario: Organizer uploads valid PDF press kit for owned concert
- **WHEN** an authenticated organizer uploads a PDF press kit for a concert they own
- **THEN** the system SHALL store the file through object storage, create an active `PRESS_KIT` asset record, create or update an artist bio processing record, and enqueue artist bio processing

#### Scenario: Organizer upload for another organizer's concert is rejected
- **WHEN** an authenticated organizer uploads a PDF press kit for a concert they do not own
- **THEN** the system SHALL reject the upload before storing the file or creating a processing job

#### Scenario: Non-PDF press kit upload is rejected
- **WHEN** an organizer uploads a file whose content type, extension, or file signature does not match an allowed PDF
- **THEN** the system SHALL reject the upload and SHALL NOT store the file as an active press kit asset

#### Scenario: Oversized press kit upload is rejected
- **WHEN** an organizer uploads a PDF larger than the configured artist bio press kit limit
- **THEN** the system SHALL reject the upload and return a validation error identifying the file size limit

### Requirement: Durable artist bio processing job state
The system SHALL persist artist bio processing state so organizers can inspect status, failure reasons, generated output, provider metadata, and retry state. The durable workflow source of truth SHALL be the artist bio record; queue jobs SHALL be transient processing triggers and SHALL NOT be the only source of workflow state.

#### Scenario: Processing job is created from upload
- **WHEN** a valid press kit upload is accepted
- **THEN** the system SHALL persist an artist bio record linked to the concert, press kit asset, requesting user, initial processing status, and retry metadata

#### Scenario: Artist bio record is the durable workflow source
- **WHEN** the system needs to show current artist bio processing status, retry state, generated output, or publication state
- **THEN** the system SHALL read that durable workflow state from the artist bio record rather than relying on transient queue job state

#### Scenario: Separate artist bio jobs table is not required
- **WHEN** this Wave 3 change is implemented
- **THEN** the system SHALL NOT require a separate `artist_bio_jobs` table to satisfy artist bio upload, processing, retry, review, and publication behavior

#### Scenario: Worker starts processing job
- **WHEN** the worker claims an artist bio job
- **THEN** the system SHALL mark the job as processing, increment retry state, and clear stale retryable error details before extracting PDF text

#### Scenario: Processing failure is durable
- **WHEN** PDF extraction or AI generation fails
- **THEN** the system SHALL mark the job as failed with an error reason, provider or extractor context where available, and retry state visible to the organizer

#### Scenario: Organizer retries failed job
- **WHEN** an organizer retries a failed artist bio job for a concert they own
- **THEN** the system SHALL reset the job for processing and enqueue it without requiring a new PDF upload

### Requirement: PDF text extraction and cleanup
The system SHALL extract text from accepted PDF press kits and clean the extracted text before AI generation.

#### Scenario: Readable PDF is normalized
- **WHEN** the worker extracts text from a readable PDF
- **THEN** the system SHALL normalize whitespace, remove unusable empty content, bound the provider input to the configured maximum length, and pass the cleaned text to the AI bio generator

#### Scenario: Empty extracted text fails clearly
- **WHEN** PDF extraction produces no usable text after cleanup
- **THEN** the system SHALL fail the job with an error reason explaining that the PDF did not contain usable text

### Requirement: AI bio provider selection
The system SHALL generate artist bios through `AiBioGeneratorPort` and SHALL support both a GeminiAI-compatible adapter and a deterministic local fallback.

#### Scenario: Gemini provider is used when configured
- **WHEN** the AI provider mode and credentials are configured for Gemini-compatible generation
- **THEN** the worker SHALL call the Gemini-compatible adapter through `AiBioGeneratorPort` and persist the provider name with the generated result

#### Scenario: Deterministic fallback is used without credentials
- **WHEN** no external AI credentials are configured for local development, tests, or grading
- **THEN** the worker SHALL use the deterministic local fallback through `AiBioGeneratorPort` and produce stable output without making a network call

#### Scenario: AI provider failure does not publish a bio
- **WHEN** the configured AI adapter fails while generating a bio
- **THEN** the system SHALL mark the job as failed and SHALL NOT publish any generated or partial bio to the public concert detail

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
