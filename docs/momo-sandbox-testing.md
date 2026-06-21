# MoMo Sandbox Testing

This project supports the internal payment simulator and MoMo sandbox side by side. Use MoMo only when you need the real sandbox redirect/deeplink/IPN flow.

## Environment

Required backend variables:

```env
MOMO_PARTNER_CODE=MOMOUDLU20220629
MOMO_ACCESS_KEY=ggoaaJa1ECRzBRYC
MOMO_SECRET_KEY=nI4o1MBg53oY5MWP3IHnYcxoUD2x2dm8
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REQUEST_TYPE=captureWallet
MOMO_RETURN_URL=http://localhost:3000/payment-return
MOMO_IPN_URL=https://<your-ngrok-domain>/payments/momo/ipn
```

`MOMO_IPN_URL` must be reachable from the internet. If the ngrok tunnel changes, update `.env`, restart the backend, and initiate a new payment.

## ngrok

Start a tunnel to the backend:

```powershell
ngrok http 3000
```

Copy the HTTPS forwarding URL and set:

```env
MOMO_IPN_URL=https://<forwarding-url>/payments/momo/ipn
```

## Happy Path

1. Create an order so it is `PENDING_PAYMENT`.
2. Initiate payment:

```http
POST /orders/{{orderId}}/payment
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "provider": "MOMO"
}
```

3. Open the returned `redirectUrl` or `providerMetadata.payUrl`.
4. Complete the sandbox payment in MoMo's test flow.
5. MoMo calls `POST /payments/momo/ipn`.

Expected backend state:

- Payment becomes `SUCCEEDED`.
- Order becomes `PAID`.
- Existing order-paid flow issues tickets once.

## Failure And Duplicate Checks

Failure IPN:

- MoMo result code other than `0` is stored as payment failure details.
- Payment becomes `FAILED`.
- Order becomes `FAILED`.
- No tickets are issued.

Invalid signature:

- Backend rejects the IPN with `400`.
- Payment/order state is not changed.
- No payment event is recorded.

Duplicate IPN:

- Same provider event is recorded once.
- Later duplicate callback is treated as an idempotent no-op.
- Payment/order state is not mutated again.
- Tickets are not duplicated.
