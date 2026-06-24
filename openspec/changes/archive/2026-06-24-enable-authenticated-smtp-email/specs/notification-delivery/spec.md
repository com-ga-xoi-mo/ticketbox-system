## ADDED Requirements

### Requirement: Authenticated SMTP email delivery

The system SHALL support delivering notification email through an authenticated, TLS-capable SMTP
provider (such as Gmail) selected by configuration, without changing notification use-cases or the
existing local/Maildev delivery path.

#### Scenario: Authenticated TLS transport is used when credentials are configured

- **WHEN** the email provider is `smtp` and SMTP username and password are configured
- **THEN** the system SHALL deliver email through an authenticated, TLS-capable SMTP transport using
  the configured host, port, secure flag, and credentials

#### Scenario: Maildev path is preserved when no credentials are configured

- **WHEN** the email provider is `smtp` and no SMTP username/password are configured
- **THEN** the system SHALL continue to use the existing plaintext SMTP transport for the local
  Maildev demo, unchanged

#### Scenario: Delivery failures remain retryable

- **WHEN** sending through the authenticated SMTP transport fails transiently
- **THEN** the failure SHALL surface to the worker's bounded-retry delivery flow without changing the
  paid order or notification persistence
