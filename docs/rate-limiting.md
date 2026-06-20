# Rate Limiting

TicketBox uses Redis-backed token bucket rate limiting at the NestJS HTTP layer. A route opts in with `@RateLimited(policy)`. Requests rejected by the limiter do not enter the controller method, so protected use cases are not invoked.

## Policies

| Policy | Scope | Actor key |
| --- | --- | --- |
| `BROWSING` | Public browsing reads when catalog endpoints exist | Client IP |
| `CHECKOUT` | `POST /checkout/orders` | Authenticated user ID, fallback IP |
| `PAYMENT_INITIATION` | `POST /orders/:id/payment` | Authenticated user ID + order ID |
| `ADMIN_WRITE` | Admin/organizer write APIs | Sorted roles + authenticated user ID |
| `CHECKIN_SYNC` | Future check-in sync endpoint | `x-device-id`, body `deviceId`, staff user ID, fallback IP |

Current route attachments:

- `POST /checkout/orders` -> `CHECKOUT`
- `POST /orders/:id/payment` -> `PAYMENT_INITIATION`
- `POST /admin/concerts/:concertId/staff` -> `ADMIN_WRITE`
- `DELETE /admin/concerts/:concertId/staff/:assignmentId` -> `ADMIN_WRITE`

There is no dedicated public concert browsing controller or check-in sync controller in the current backend slice. When those endpoints are added, attach `BROWSING` to public catalog reads and `CHECKIN_SYNC` to check-in event sync.

## Responses

When a token bucket is exhausted, the API returns:

- HTTP `429 Too Many Requests`
- `Retry-After` response header in seconds
- JSON error body consistent with NestJS exceptions

If Redis is unavailable:

- `BROWSING` fails open so low-risk public reads can continue.
- Protected unsafe policies fail closed with controlled `503 Service Unavailable`.

## Payment Reliability Boundary

Payment initiation rate limiting runs before `InitiatePaymentUseCase`. A rejected payment initiation request does not:

- create or update payment idempotency records
- call the payment provider
- mutate payment circuit breaker state
- change order lifecycle state

This keeps rate limiting separate from payment idempotency, circuit breaker, provider callback, and reconciliation behavior.

## Manual Testing

1. Start dependencies and API.
2. Login as an audience user and keep the access token.
3. Send `POST /checkout/orders` repeatedly with the same token faster than the local checkout policy.
4. The first requests should pass until the bucket is exhausted.
5. Excess requests should return `429` with `Retry-After`.
6. Send `POST /orders/:id/payment` repeatedly for the same order and user.
7. Excess payment initiation requests should return `429`; no provider redirect should be created for rejected attempts.
8. Login as organizer/admin and send repeated staff assignment writes to verify `ADMIN_WRITE`.

Use a different endpoint class after exhausting one bucket to verify policy isolation, for example checkout exhaustion should not consume payment initiation or admin-write buckets.
