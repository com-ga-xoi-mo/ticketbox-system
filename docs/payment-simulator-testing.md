# Payment Simulator Testing

Use `docs/postman/payment-simulator.postman_collection.json` with `docs/postman/payment-simulator-local.postman_environment.json`.

## Setup

1. Start local dependencies and API.
2. Select the `TicketBox Payment Simulator Local` environment in Postman.
3. Fill `concertId` and `ticketTypeId` with seeded active values if your database seed differs from the defaults.
4. Run `1.1 Register Audience User`, then `1.2 Login`.

## Success And Duplicate Callback

1. Run `2.1 Create Order`.
2. Run `3.1 Initiate Simulator Payment`.
3. Run `4.1 Callback Success`.
4. Run `4.2 Callback Success Again - Duplicate`.

Expected result: the first callback marks payment `SUCCEEDED` and transitions the order. The second callback returns `duplicate: true` and `orderTransitioned: false`.

## Failure

1. Run `2.1 Create Order` again to create a fresh pending order.
2. Run `3.1 Initiate Simulator Payment`.
3. Run `4.3 Callback Failure`.

Expected result: payment becomes `FAILED`, order becomes `FAILED`, and no tickets are issued.

## Timeout

1. Run `2.1 Create Order` again to create a fresh pending order.
2. Run `3.1 Initiate Simulator Payment`.
3. Run `4.4 Callback Timeout`.

Expected result: payment remains `PENDING` and order remains `PENDING_PAYMENT`. Reservation expiration or later reconciliation handles cleanup.

## Delayed Callback

1. Run `2.1 Create Order` again to create a fresh pending order.
2. Run `3.1 Initiate Simulator Payment`.
3. Run `4.5 Redirect Endpoint - Delayed Success`.
4. Run `4.1 Callback Success` when you want to complete it.

Expected result: delayed outcome keeps payment pending until the final success callback is sent.
