import { ConcertStatus, OrderStatus, PrismaClient, TicketStatus } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaConcertReminderReadAdapter } from '../../packages/backend/src/notification/infrastructure/database/prisma-concert-reminder-read.adapter';

const runWithDb = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

const prisma = new PrismaClient();
const adapter = new PrismaConcertReminderReadAdapter(prisma as never);

const NONCE = `__cr_read_test__${Date.now()}`;
const WINDOW_START = new Date('2099-01-02T00:00:00.000Z');
const WINDOW_END = new Date('2099-01-02T00:05:00.000Z');
const IN_WINDOW = new Date('2099-01-02T00:02:30.000Z');
const OUT_OF_WINDOW = new Date('2099-01-03T00:00:00.000Z');

const ids = {
  creator: '',
  buyer: '',
  otherBuyer: '',
  publishedConcert: '',
  draftConcert: '',
  cancelledConcert: '',
  outOfWindowConcert: '',
};

async function createConcert(
  title: string,
  status: ConcertStatus,
  startsAt: Date,
): Promise<string> {
  const concert = await prisma.concert.create({
    data: {
      slug: `${NONCE}-${title}`,
      title: `${NONCE} ${title}`,
      artistName: 'Test Artist',
      venueName: 'Test Venue',
      city: 'HCMC',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      status,
      createdById: ids.creator,
    },
  });
  return concert.id;
}

/** Creates a PAID order with `count` ISSUED tickets for `userId` on `concertId`. */
async function createPaidTickets(
  userId: string,
  concertId: string,
  count: number,
  ticketStatus: TicketStatus = TicketStatus.ISSUED,
  orderStatus: OrderStatus = OrderStatus.PAID,
): Promise<void> {
  const ticketType = await prisma.ticketType.create({
    data: {
      concertId,
      code: `${NONCE.slice(-20)}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'GA',
      priceVnd: 100000,
      totalQuantity: 100,
      maxPerUser: 10,
      saleStartsAt: new Date('2020-01-01T00:00:00.000Z'),
      saleEndsAt: new Date('2098-01-01T00:00:00.000Z'),
    },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: `${NONCE}-${Math.random().toString(36).slice(2, 10)}`,
      userId,
      concertId,
      status: orderStatus,
      totalAmountVnd: 100000 * count,
    },
  });
  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      ticketTypeId: ticketType.id,
      quantity: count,
      unitPriceVnd: 100000,
      totalPriceVnd: 100000 * count,
    },
  });
  for (let i = 0; i < count; i += 1) {
    await prisma.ticket.create({
      data: {
        ticketNumber: `${NONCE}-${Math.random().toString(36).slice(2, 12)}`,
        orderId: order.id,
        orderItemId: orderItem.id,
        userId,
        concertId,
        ticketTypeId: ticketType.id,
        qrTokenHash: `${NONCE}-${Math.random().toString(36).slice(2, 16)}`,
        status: ticketStatus,
      },
    });
  }
}

beforeAll(async () => {
  if (process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true') return;

  const creator = await prisma.user.create({
    data: {
      email: `${NONCE}-creator@ticketbox.test`,
      passwordHash: 'x',
      displayName: 'Creator',
    },
  });
  ids.creator = creator.id;

  const buyer = await prisma.user.create({
    data: { email: `${NONCE}-buyer@ticketbox.test`, passwordHash: 'x', displayName: 'Buyer One' },
  });
  ids.buyer = buyer.id;

  const otherBuyer = await prisma.user.create({
    data: { email: `${NONCE}-other@ticketbox.test`, passwordHash: 'x', displayName: 'Buyer Two' },
  });
  ids.otherBuyer = otherBuyer.id;

  ids.publishedConcert = await createConcert('published', ConcertStatus.PUBLISHED, IN_WINDOW);
  ids.draftConcert = await createConcert('draft', ConcertStatus.DRAFT, IN_WINDOW);
  ids.cancelledConcert = await createConcert('cancelled', ConcertStatus.CANCELLED, IN_WINDOW);
  ids.outOfWindowConcert = await createConcert(
    'outofwindow',
    ConcertStatus.PUBLISHED,
    OUT_OF_WINDOW,
  );
});

afterAll(async () => {
  if (!(process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true')) {
    await prisma.ticket.deleteMany({ where: { ticketNumber: { startsWith: NONCE } } });
    await prisma.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: NONCE } } } });
    await prisma.order.deleteMany({ where: { orderNumber: { startsWith: NONCE } } });
    await prisma.ticketType.deleteMany({ where: { concert: { slug: { startsWith: NONCE } } } });
    await prisma.concert.deleteMany({ where: { slug: { startsWith: NONCE } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: NONCE } } });
  }
  await prisma.$disconnect();
});

describe('PrismaConcertReminderReadAdapter', () => {
  runWithDb('returns only published concerts inside the window', async () => {
    const concerts = await adapter.findConcertsStartingWithin(WINDOW_START, WINDOW_END);
    const slugs = concerts.map((c) => c.concertId);

    expect(slugs).toContain(ids.publishedConcert);
    expect(slugs).not.toContain(ids.draftConcert);
    expect(slugs).not.toContain(ids.cancelledConcert);
    expect(slugs).not.toContain(ids.outOfWindowConcert);
  });

  runWithDb('returns distinct valid ticket holders with ticket counts', async () => {
    await createPaidTickets(ids.buyer, ids.publishedConcert, 2);
    await createPaidTickets(ids.otherBuyer, ids.publishedConcert, 1);

    const holders = await adapter.findValidTicketHolders(ids.publishedConcert);
    const buyer = holders.find((h) => h.userId === ids.buyer);

    expect(holders).toHaveLength(2);
    expect(buyer?.ticketCount).toBe(2);
    expect(buyer?.toEmail).toBe(`${NONCE}-buyer@ticketbox.test`);
    expect(buyer?.userDisplayName).toBe('Buyer One');
  });

  runWithDb('excludes voided/refunded tickets and non-paid orders', async () => {
    const cancelledConcertId = ids.cancelledConcert; // reuse as an isolated concert for holders
    await createPaidTickets(ids.buyer, cancelledConcertId, 1, TicketStatus.VOIDED);
    await createPaidTickets(ids.otherBuyer, cancelledConcertId, 1, TicketStatus.REFUNDED);
    await createPaidTickets(
      ids.buyer,
      cancelledConcertId,
      1,
      TicketStatus.ISSUED,
      OrderStatus.PENDING_PAYMENT,
    );

    const holders = await adapter.findValidTicketHolders(cancelledConcertId);

    expect(holders).toHaveLength(0);
  });
});
