import {
  assertPass,
  clearRedisPattern,
  clearSubmissionRedisState,
  countByStatus,
  createOrder,
  createPublishedConcertWithTicketType,
  rawRequest,
  registerAudience,
  shutdown,
  uniqueRunId,
  waitForApiHealth,
} from './lib/submission-test-utils.mjs';

async function main() {
  await waitForApiHealth();
  await clearSubmissionRedisState();

  const runId = uniqueRunId('payment-reliability');
  const { concert, ticketType } = await createPublishedConcertWithTicketType({
    runId,
    title: 'Submission Payment Reliability Attack Test',
    ticketCode: 'PAY',
    totalQuantity: 10,
    maxPerUser: 10,
    priceVnd: 120_000,
  });

  const token = await registerAudience(`${runId}@submission.test`, 'Submission Payment Attacker');
  const order = await createOrder({
    token,
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    quantity: 2,
    idempotencyKey: `${runId}-order`,
  });

  await clearRedisPattern('ticketbox:rate-limit:*');

  const paymentIdempotencyKey = `${runId}-payment`;
  const initiateBody = {
    provider: 'SIMULATOR',
    idempotencyKey: paymentIdempotencyKey,
  };

  const concurrentInitiations = await Promise.all(
    Array.from({ length: 3 }, () =>
      rawRequest(`/orders/${order.id}/payment`, {
        token,
        body: initiateBody,
      }).catch((error) => ({
        status: 'ERR',
        body: error instanceof Error ? error.message : String(error),
      })),
    ),
  );

  const successfulInitiations = concurrentInitiations.filter(
    (result) => result.status >= 200 && result.status < 300,
  );
  const conflictInitiations = concurrentInitiations.filter((result) => result.status === 409);

  assertPass(successfulInitiations.length >= 1, 'Expected one successful payment initiation', {
    statusCounts: countByStatus(concurrentInitiations),
  });
  assertPass(
    successfulInitiations.length + conflictInitiations.length === concurrentInitiations.length,
    'Payment initiation should either succeed/replay or return controlled conflict under race',
    {
      statusCounts: countByStatus(concurrentInitiations),
      responses: concurrentInitiations.map((result) => result.body),
    },
  );

  const firstSuccess = successfulInitiations[0].body;
  assertPass(firstSuccess?.payment?.id, 'Successful initiation missing payment id', firstSuccess);
  assertPass(firstSuccess?.simulatorToken, 'Simulator initiation missing simulatorToken', firstSuccess);

  await clearRedisPattern('ticketbox:rate-limit:*');

  const replay = await rawRequest(`/orders/${order.id}/payment`, {
    token,
    body: initiateBody,
  });
  assertPass(replay.status >= 200 && replay.status < 300, 'Same payment key replay should succeed', replay);
  assertPass(
    replay.body?.payment?.id === firstSuccess.payment.id,
    'Same idempotency key did not replay the original payment',
    { firstPaymentId: firstSuccess.payment.id, replayPaymentId: replay.body?.payment?.id },
  );

  await clearRedisPattern('ticketbox:rate-limit:*');

  const mismatch = await rawRequest(`/orders/${order.id}/payment`, {
    token,
    body: {
      provider: 'VNPAY',
      idempotencyKey: paymentIdempotencyKey,
    },
  });
  assertPass(mismatch.status === 409, 'Different payload with same payment idempotency key must be rejected', {
    status: mismatch.status,
    body: mismatch.body,
  });

  const providerEventId = `${runId}-provider-event`;
  const callback1 = await rawRequest('/payments/simulator/callback', {
    body: {
      token: firstSuccess.simulatorToken,
      outcome: 'success',
      providerEventId,
    },
  });
  const callback2 = await rawRequest('/payments/simulator/callback', {
    body: {
      token: firstSuccess.simulatorToken,
      outcome: 'success',
      providerEventId,
    },
  });

  assertPass(callback1.ok, 'First simulator success callback failed', callback1);
  assertPass(callback2.ok, 'Duplicate simulator success callback failed', callback2);
  assertPass(callback2.body?.duplicate === true, 'Duplicate callback should be marked duplicate', callback2.body);

  const orderAfterPayment = await rawRequest(`/me/orders/${order.id}`, { token });
  assertPass(orderAfterPayment.ok, 'Cannot fetch order after payment', orderAfterPayment);
  assertPass(orderAfterPayment.body?.status === 'PAID', 'Order should be PAID after successful callback', {
    status: orderAfterPayment.body?.status,
    order: orderAfterPayment.body,
  });

  const tickets = await rawRequest('/me/tickets', { token });
  assertPass(tickets.ok, 'Cannot fetch tickets after payment', tickets);
  const orderTickets = tickets.body.filter((ticket) => ticket.orderId === order.id);
  assertPass(orderTickets.length === 2, 'Duplicate callback changed ticket issuance count', {
    expected: 2,
    actual: orderTickets.length,
    orderTickets,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        script: 'payment-reliability',
        orderId: order.id,
        paymentId: firstSuccess.payment.id,
        initiationStatusCounts: countByStatus(concurrentInitiations),
        replayPaymentId: replay.body.payment.id,
        mismatchStatus: mismatch.status,
        callback1: {
          status: callback1.status,
          duplicate: callback1.body.duplicate,
          orderTransitioned: callback1.body.orderTransitioned,
        },
        callback2: {
          status: callback2.status,
          duplicate: callback2.body.duplicate,
          orderTransitioned: callback2.body.orderTransitioned,
        },
        finalOrderStatus: orderAfterPayment.body.status,
        issuedTicketCount: orderTickets.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          script: 'payment-reliability',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(() => shutdown());
