# encoding-hardening

## Purpose
TBD: Fixes and regressions tests for UTF-8 encoding issues, including BOM handling and correct serialization of Vietnamese characters in CSV, emails, and API responses.

## Requirements

### Requirement: Shared UTF-8 BOM utility for backend
The system SHALL provide a shared utility module at `packages/backend/src/shared/encoding/utf8.util.ts` that exports functions for BOM handling: `stripBom(text: string): string` to remove a leading UTF-8 BOM character (`\uFEFF`) from a string, and `prependBom(text: string): string` to prepend a UTF-8 BOM if not already present.

#### Scenario: Strip BOM from text with BOM
- **WHEN** `stripBom` is called with a string that starts with `\uFEFF`
- **THEN** the function returns the string without the leading BOM character

#### Scenario: Strip BOM from text without BOM
- **WHEN** `stripBom` is called with a string that does not start with `\uFEFF`
- **THEN** the function returns the string unchanged

#### Scenario: Prepend BOM to text without BOM
- **WHEN** `prependBom` is called with a string that does not start with `\uFEFF`
- **THEN** the function returns the string with `\uFEFF` prepended

#### Scenario: Prepend BOM to text already with BOM
- **WHEN** `prependBom` is called with a string that already starts with `\uFEFF`
- **THEN** the function returns the string unchanged (no double BOM)

### Requirement: CSV parser uses shared BOM utility
The guest-list CSV parser (`guest-list-csv.parser.ts`) SHALL use the shared `stripBom` utility instead of the inline BOM-stripping regex.

#### Scenario: CSV with BOM parsed correctly
- **WHEN** a CSV file with a UTF-8 BOM is uploaded for guest-list import
- **THEN** the parser strips the BOM using the shared utility and parses headers correctly

### Requirement: Vietnamese text regression tests for CSV round-trip
The system SHALL include regression tests that verify Vietnamese text with diacritics (e.g., `Nguyễn Văn Ân`, `Trần Thị Bích Hường`) round-trips correctly through the CSV parser without data corruption.

#### Scenario: Vietnamese names survive CSV parse
- **WHEN** a CSV file containing Vietnamese names with diacritics (`ắ`, `ễ`, `ợ`, `ừ`, `ơ`, `ư`) is parsed by the guest-list CSV parser
- **THEN** the parsed output contains the exact same Vietnamese characters without mojibake or replacement characters

#### Scenario: Vietnamese text with BOM survives CSV parse
- **WHEN** a CSV file with a UTF-8 BOM and Vietnamese text is parsed
- **THEN** the BOM is stripped and Vietnamese text is preserved correctly in all fields

### Requirement: Vietnamese text regression tests for email content
The system SHALL include regression tests that verify Vietnamese text is correctly encoded in SMTP email content, preserving all diacritical marks in both headers and body.

#### Scenario: Email body with Vietnamese text preserves diacritics
- **WHEN** an email is composed with Vietnamese text in the body (e.g., `Xin chào, đơn hàng của bạn đã được xác nhận`)
- **THEN** the SMTP adapter produces output with `Content-Type: text/plain; charset=utf-8` header and the body text preserves all Vietnamese diacritics

#### Scenario: Email subject with Vietnamese text preserves diacritics
- **WHEN** an email is composed with a Vietnamese subject line
- **THEN** the subject line in the outgoing email preserves all Vietnamese diacritical characters

### Requirement: Vietnamese text regression tests for API responses
The system SHALL include regression tests that verify Vietnamese text in API JSON responses is correctly encoded without escaping or corruption.

#### Scenario: API response with Vietnamese error message
- **WHEN** an API endpoint returns an error with a Vietnamese message (e.g., `Mã khuyến mãi không hợp lệ`)
- **THEN** the JSON response body contains the exact Vietnamese string without Unicode escape sequences or mojibake
