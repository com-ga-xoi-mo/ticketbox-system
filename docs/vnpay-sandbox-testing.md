# VNPay Sandbox Testing

TicketBox supports VNPay sandbox beside the simulator and MoMo. VNPay initiation reuses the existing order ownership checks, payment idempotency, provider circuit breaker, payment persistence, order lifecycle, inventory confirmation/release, and QR ticket issuance.

## Secret Configuration

Keep the merchant terminal code and hash secret only in the local `.env` or the deployment secret store. Do not put real values in `.env.example`, Postman exports, screenshots, commits, or chat logs.

```env
VNPAY_TMN_CODE=<sandbox terminal code>
VNPAY_HASH_SECRET=<sandbox hash secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://<public-domain>/payments/vnpay/return
VNPAY_IPN_URL=https://<public-domain>/payments/vnpay/ipn
VNPAY_VERSION=2.1.0
VNPAY_COMMAND=pay
VNPAY_LOCALE=vn
VNPAY_ORDER_TYPE=other
VNPAY_EXPIRE_MINUTES=15
```

The SIT portal username/password are only for manually logging into VNPay's testing portal. The backend does not need them and they must not be stored in this repository.

## Public Callback URL

Start the backend on port `3000`, then expose it:

```powershell
ngrok http 3000
```

Set both callback URLs to the current HTTPS domain and restart the backend. Configure the IPN URL in the VNPay sandbox merchant/SIT configuration when VNPay requires registration outside the signed payment URL.

The return and IPN endpoints have different responsibilities:

- `GET /payments/vnpay/return`: verifies the signature and returns display data only.
- `GET /payments/vnpay/ipn`: authoritative server callback that updates payment/order state.

## Postman Flow

Import:

- `docs/postman/vnpay-sandbox.postman_collection.json`
- `docs/postman/vnpay-sandbox-local.postman_environment.json`

Run requests in order:

1. Register or login.
2. Create a fresh `PENDING_PAYMENT` order.
3. Initiate VNPay payment. The body includes provider `VNPAY` and a payment idempotency key.
4. Open the returned `redirectUrl` in a browser.
5. Complete or cancel the transaction on VNPay sandbox.
6. Wait for VNPay IPN, then call Get My Order and List My Tickets.

## Expected Results

Successful transaction:

- VNPay IPN response is `{"RspCode":"00","Message":"Confirm Success"}`.
- Payment becomes `SUCCEEDED`.
- Order becomes `PAID`.
- Reserved inventory becomes sold inventory.
- Tickets are issued once.

Failed or cancelled final transaction:

- Payment becomes `FAILED`.
- Order becomes `FAILED`.
- Reserved inventory is released.
- No ticket is issued.

Duplicate IPN:

- First callback processes normally.
- Repeated callback receives `RspCode` `02`.
- Payment/order are not updated again.
- Inventory and tickets are not duplicated.

Invalid callback:

- Invalid signature receives `RspCode` `97`.
- Unknown merchant transaction receives `RspCode` `01`.
- Amount mismatch receives `RspCode` `04`.
- No payment/order/ticket state is changed.

Idempotent initiation:

- Repeating initiation with the same user, order, provider, and idempotency key returns the original payment and redirect URL.
- Reusing the key with a different order or provider returns conflict.
- Concurrent same-key requests create at most one provider attempt.

Provider isolation:

- An open VNPay circuit blocks new VNPay initiation with a controlled service-unavailable error.
- MoMo and simulator circuits remain independent.
