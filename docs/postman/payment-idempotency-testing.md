# Payment Initiation Idempotency Testing

Use `docs/postman/payment-simulator.postman_collection.json` with
`docs/postman/payment-simulator-local.postman_environment.json`.

## Simulator

1. Run auth requests.
2. Create a pending order.
3. Run `3.1 Initiate Simulator Payment`.
   - The pre-request script creates `paymentIdempotencyKey`.
   - The response stores `paymentId`, `simulatorToken`, and `redirectUrl`.
4. Run `3.2 Initiate Simulator Payment Again - Same Idempotency Key`.
   - Expected: `201`.
   - Expected: same `payment.id` and same `redirectUrl`.
   - Expected: no second provider transaction.
5. Run `3.3 Initiate Different Provider With Same Idempotency Key - Conflict`.
   - Expected: `409 Conflict`.

## MoMo

To test MoMo idempotency manually, use the same `POST /orders/{{orderId}}/payment`
request body shape and set:

```json
{
  "provider": "MOMO",
  "idempotencyKey": "{{paymentIdempotencyKey}}"
}
```

Repeat the exact same request with the same key.

Expected:

- same payment initiation result is returned
- no second MoMo create-payment call is made

Then reuse the same `paymentIdempotencyKey` with a different order or provider.

Expected:

- `409 Conflict`
- no new payment attempt
- no provider call
