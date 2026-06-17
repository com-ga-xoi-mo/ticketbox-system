## Implementation Notes

### QR hash handoff

This implementation uses a minimal SHA-256 hash adapter over the raw `qrPayload`
string when resolving `tickets.qr_token_hash`. Before merge, confirm this matches
Member 3's `implement-qr-ticket-issuance` token/hash contract. If Member 3's
contract changes, replace only the adapter boundary and keep the check-in use case
unchanged.

### Mobile unauthorized handoff

The backend keeps missing/invalid JWT and non-`CHECKIN_STAFF` access as HTTP
`401`/`403` authorization errors. Mapping those transport errors to the local
mobile `unauthorized` scan state belongs to `implement-checkin-mobile-app` or a
later mobile/offline follow-up, not this backend API change.
