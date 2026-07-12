import { createHash } from 'node:crypto';

import {
  assertPass,
  clearRedisPattern,
  clearSubmissionRedisState,
  createOrder,
  createPublishedConcertWithTicketType,
  prisma,
  rawRequest,
  registerAudience,
  shutdown,
  uniqueRunId,
  waitForApiHealth,
  login,
} from './lib/submission-test-utils.mjs';

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function issueTickets({ token, concertId, ticketTypeId, quantity, runId, suffix }) {
  const order = await createOrder({
    token,
    concertId,
    ticketTypeId,
    quantity,
    idempotencyKey: `${runId}-order-${suffix}`,
  });

  await clearRedisPattern('ticketbox:rate-limit:*');

  const payment = await rawRequest(`/orders/${order.id}/payment`, {
    token,
    body: {
      provider: 'SIMULATOR',
      idempotencyKey: `${runId}-payment-${suffix}`,
    },
  });
  assertPass(payment.ok, 'Simulator payment initiation failed for check-in setup', payment);

  const callback = await rawRequest('/payments/simulator/callback', {
    body: {
      token: payment.body.simulatorToken,
      outcome: 'success',
      providerEventId: `${runId}-provider-${suffix}`,
    },
  });
  assertPass(callback.ok, 'Simulator success callback failed for check-in setup', callback);

  const tickets = await rawRequest('/me/tickets', { token });
  assertPass(tickets.ok, 'Cannot list issued tickets for check-in setup', tickets);

  const issuedTickets = tickets.body.filter((ticket) => ticket.orderId === order.id);
  assertPass(issuedTickets.length === quantity, 'Unexpected issued ticket count for check-in setup', {
    expected: quantity,
    actual: issuedTickets.length,
    issuedTickets,
  });

  return { order, tickets: issuedTickets };
}

async function getTicketDetail(token, ticketId) {
  const detail = await rawRequest(`/me/tickets/${ticketId}`, { token });
  assertPass(detail.ok, 'Cannot load ticket detail with QR payload', detail);
  assertPass(detail.body?.qrPayload, 'Ticket detail missing qrPayload', detail.body);
  return detail.body;
}

async function main() {
  await waitForApiHealth();
  await clearSubmissionRedisState();

  const runId = uniqueRunId('checkin-sync');
  const { concert, ticketType } = await createPublishedConcertWithTicketType({
    runId,
    title: 'Submission Check-in Sync Attack Test',
    ticketCode: 'CHK',
    totalQuantity: 10,
    maxPerUser: 10,
    priceVnd: 100_000,
  });

  const audienceToken = await registerAudience(
    `${runId}@submission.test`,
    'Submission Check-in Audience',
  );
  const staffToken = await login('staff@ticketbox.test');
  const staff = await prisma.user.findUnique({ where: { email: 'staff@ticketbox.test' } });
  assertPass(staff, 'Seed check-in staff user not found. Run "npm run db:seed".');

  const assignment = await prisma.checkinStaffAssignment.create({
    data: {
      staffId: staff.id,
      concertId: concert.id,
      gateName: 'Main Gate',
      status: 'ACTIVE',
    },
  });

  const onlineSetup = await issueTickets({
    token: audienceToken,
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
    runId,
    suffix: 'online',
  });
  const onlineTicket = await getTicketDetail(audienceToken, onlineSetup.tickets[0].id);

  const onlinePayload = {
    assignmentId: assignment.id,
    concertId: concert.id,
    gate: 'Main Gate',
    qrPayload: onlineTicket.qrPayload,
    scannedAt: new Date().toISOString(),
    deviceId: `${runId}-online-device`,
  };

  await clearRedisPattern('ticketbox:rate-limit:*');
  const onlineScan1 = await rawRequest('/checkin/scan', {
    token: staffToken,
    body: onlinePayload,
  });
  const onlineScan2 = await rawRequest('/checkin/scan', {
    token: staffToken,
    body: { ...onlinePayload, scannedAt: new Date().toISOString() },
  });

  assertPass(onlineScan1.ok, 'First online check-in scan failed', onlineScan1);
  assertPass(onlineScan2.ok, 'Duplicate online check-in scan failed', onlineScan2);
  assertPass(onlineScan1.body?.status === 'accepted', 'First online scan should be accepted', {
    body: onlineScan1.body,
  });
  assertPass(onlineScan2.body?.status === 'duplicate', 'Second online scan should be duplicate', {
    body: onlineScan2.body,
  });

  const offlineSetup = await issueTickets({
    token: audienceToken,
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
    runId,
    suffix: 'offline',
  });
  const offlineTicket = await getTicketDetail(audienceToken, offlineSetup.tickets[0].id);

  const offlineEvent = {
    localId: `${runId}-offline-local-1`,
    assignmentId: assignment.id,
    concertId: concert.id,
    gate: 'Main Gate',
    qrPayloadHash: sha256Hex(offlineTicket.qrPayload),
    scannedAt: new Date().toISOString(),
    deviceId: `${runId}-offline-device`,
  };

  await clearRedisPattern('ticketbox:rate-limit:*');
  const offlineSync1 = await rawRequest('/checkin/sync', {
    token: staffToken,
    body: {
      concertId: concert.id,
      events: [offlineEvent],
    },
  });
  const offlineSyncReplay = await rawRequest('/checkin/sync', {
    token: staffToken,
    body: {
      concertId: concert.id,
      events: [offlineEvent],
    },
  });

  assertPass(offlineSync1.ok, 'Offline sync failed', offlineSync1);
  assertPass(offlineSyncReplay.ok, 'Offline sync replay failed', offlineSyncReplay);
  assertPass(
    offlineSync1.body?.results?.[0]?.status === 'accepted',
    'First offline sync event should be accepted',
    offlineSync1.body,
  );
  assertPass(
    offlineSyncReplay.body?.results?.[0]?.status === 'accepted',
    'Offline sync replay should return the same accepted outcome',
    offlineSyncReplay.body,
  );

  const invalidSync = await rawRequest('/checkin/sync', {
    token: staffToken,
    body: {
      concertId: concert.id,
      events: [
        {
          ...offlineEvent,
          localId: `${runId}-invalid-local-1`,
          qrPayloadHash: '0'.repeat(64),
        },
      ],
    },
  });
  assertPass(invalidSync.ok, 'Invalid offline sync event should return a controlled result', invalidSync);
  assertPass(
    invalidSync.body?.results?.[0]?.status === 'invalid',
    'Invalid offline sync event should be marked invalid',
    invalidSync.body,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        script: 'checkin-sync',
        concertId: concert.id,
        assignmentId: assignment.id,
        online: {
          firstStatus: onlineScan1.body.status,
          duplicateStatus: onlineScan2.body.status,
          ticketId: onlineTicket.id,
        },
        offline: {
          firstStatus: offlineSync1.body.results[0].status,
          replayStatus: offlineSyncReplay.body.results[0].status,
          invalidStatus: invalidSync.body.results[0].status,
          ticketId: offlineTicket.id,
        },
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
          script: 'checkin-sync',
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
