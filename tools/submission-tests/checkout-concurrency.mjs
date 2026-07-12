import {
  assertPass,
  clearSubmissionRedisState,
  countByStatus,
  createOrder,
  createPublishedConcertWithTicketType,
  prisma,
  rawRequest,
  registerAudience,
  registerAudienceUsers,
  shutdown,
  summarizeOrderQuantityForTicketType,
  uniqueRunId,
  waitForApiHealth,
} from './lib/submission-test-utils.mjs';

async function runNoOversellAttack() {
  const runId = uniqueRunId('no-oversell');
  const availableSeats = Number(process.env.NO_OVERSELL_SEATS ?? 5);
  const attackers = Number(process.env.NO_OVERSELL_ATTACKERS ?? 50);

  const { concert, ticketType } = await createPublishedConcertWithTicketType({
    runId,
    title: 'Submission No Oversell Attack Test',
    ticketCode: 'SVIP',
    totalQuantity: availableSeats,
    maxPerUser: 1,
    priceVnd: 100_000,
  });

  const users = await registerAudienceUsers(attackers, runId);
  await clearSubmissionRedisState();

  const results = await Promise.all(
    users.map((user, index) =>
      rawRequest('/checkout/orders', {
        token: user.token,
        body: {
          concertId: concert.id,
          idempotencyKey: `${runId}-order-${index}`,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        },
      }).catch((error) => ({
        status: 'ERR',
        body: error instanceof Error ? error.message : String(error),
      })),
    ),
  );

  const successful = results.filter((result) => result.status >= 200 && result.status < 300);
  const conflicts = results.filter((result) => result.status === 409);
  const throttled = results.filter((result) => result.status === 429);
  const activeQuantity = await summarizeOrderQuantityForTicketType(ticketType.id);
  const refreshedTicketType = await prisma.ticketType.findUniqueOrThrow({
    where: { id: ticketType.id },
  });

  assertPass(throttled.length === 0, 'No-oversell test should not be hidden by checkout rate limiting', {
    statusCounts: countByStatus(results),
  });
  assertPass(successful.length <= availableSeats, 'Oversell detected: too many checkout successes', {
    availableSeats,
    successful: successful.length,
  });
  assertPass(activeQuantity <= availableSeats, 'Oversell detected in active order item quantity', {
    availableSeats,
    activeQuantity,
  });
  assertPass(
    refreshedTicketType.reservedQuantity + refreshedTicketType.soldQuantity <=
      refreshedTicketType.totalQuantity,
    'Ticket counters exceeded total quantity',
    refreshedTicketType,
  );
  assertPass(conflicts.length > 0, 'Expected at least one inventory conflict under contention', {
    statusCounts: countByStatus(results),
  });

  return {
    name: 'no-oversell concurrent checkout',
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    attackers,
    availableSeats,
    statusCounts: countByStatus(results),
    successful: successful.length,
    activeQuantity,
    counters: {
      totalQuantity: refreshedTicketType.totalQuantity,
      reservedQuantity: refreshedTicketType.reservedQuantity,
      soldQuantity: refreshedTicketType.soldQuantity,
    },
  };
}

async function runPerUserLimitAttack() {
  const runId = uniqueRunId('per-user-limit');
  const maxPerUser = Number(process.env.PER_USER_LIMIT ?? 2);
  const concurrentRequests = Number(process.env.PER_USER_ATTACKERS ?? 5);

  const { concert, ticketType } = await createPublishedConcertWithTicketType({
    runId,
    title: 'Submission Per User Limit Attack Test',
    ticketCode: 'LIMIT',
    totalQuantity: 100,
    maxPerUser,
    priceVnd: 80_000,
  });

  const token = await registerAudience(`${runId}@submission.test`, 'Submission Per User Attacker');
  await clearSubmissionRedisState();

  const results = await Promise.all(
    Array.from({ length: concurrentRequests }, (_, index) =>
      rawRequest('/checkout/orders', {
        token,
        body: {
          concertId: concert.id,
          idempotencyKey: `${runId}-same-user-${index}`,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        },
      }).catch((error) => ({
        status: 'ERR',
        body: error instanceof Error ? error.message : String(error),
      })),
    ),
  );

  const successful = results.filter((result) => result.status >= 200 && result.status < 300);
  const conflicts = results.filter((result) => result.status === 409);
  const throttled = results.filter((result) => result.status === 429);
  const activeQuantity = await summarizeOrderQuantityForTicketType(ticketType.id);

  assertPass(throttled.length === 0, 'Per-user test should not be hidden by checkout rate limiting', {
    statusCounts: countByStatus(results),
    concurrentRequests,
  });
  assertPass(successful.length <= maxPerUser, 'Per-user limit bypass detected', {
    maxPerUser,
    successful: successful.length,
  });
  assertPass(activeQuantity <= maxPerUser, 'Per-user active quantity exceeds maxPerUser', {
    maxPerUser,
    activeQuantity,
  });
  assertPass(conflicts.length > 0, 'Expected at least one per-user limit conflict', {
    statusCounts: countByStatus(results),
  });

  return {
    name: 'same-user concurrent max_per_user enforcement',
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    concurrentRequests,
    maxPerUser,
    statusCounts: countByStatus(results),
    successful: successful.length,
    activeQuantity,
  };
}

async function main() {
  await waitForApiHealth();
  const redisCleanup = await clearSubmissionRedisState();
  const noOversell = await runNoOversellAttack();
  const perUser = await runPerUserLimitAttack();

  console.log(
    JSON.stringify(
      {
        ok: true,
        script: 'checkout-concurrency',
        redisCleanup,
        results: [noOversell, perUser],
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
          script: 'checkout-concurrency',
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
