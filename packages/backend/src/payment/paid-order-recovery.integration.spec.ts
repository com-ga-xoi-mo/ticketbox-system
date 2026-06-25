import { randomUUID } from 'node:crypto';

import {
  ConcertStatus,
  OrderStatus as PrismaOrderStatus,
  PaymentStatus as PrismaPaymentStatus,
  PrismaClient,
  TicketStatus,
} from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { IssueTicketsForPaidOrderUseCase } from '../ordering/application/use-cases/issue-tickets-for-paid-order.use-case';
import { TransitionOrderStatusUseCase } from '../ordering/application/use-cases/transition-order-status.use-case';
import {
  InventoryReservationConflictError,
  OrderConflictError,
  PaidOrderExpirationSkippedError,
} from '../ordering/domain/errors';
import { OrderStatus } from '../ordering/domain/order-status.enum';
import type { IOrderEventPublisher } from '../ordering/domain/ports/order-event-publisher.port';
import { QrTicketTokenService } from '../ordering/domain/qr-ticket-token.service';
import { PrismaInventoryReservationRepository } from '../ordering/infrastructure/database/prisma-inventory-reservation.repository';
import { PrismaOrderRepository } from '../ordering/infrastructure/database/prisma-order.repository';
import { PrismaTicketRepository } from '../ordering/infrastructure/database/prisma-ticket.repository';
import {
  SuccessfulPaymentFinalizationOutcome,
  SuccessfulPaymentRecoverySource,
} from './domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from './domain/ports/payment-recovery-repository.port';
import { FinalizeSuccessfulPaymentUseCase } from './application/use-cases/finalize-successful-payment.use-case';
import { RepairSuccessfulPaymentsUseCase } from './application/use-cases/repair-successful-payments.use-case';
import { PrismaPaymentRecoveryRepository } from './infrastructure/database/prisma-payment-recovery.repository';
import { PrismaPaymentRepository } from './infrastructure/database/prisma-payment.repository';

const runWithDb =
  process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

const prisma = new PrismaClient();
const nonce = `paid-recovery-${Date.now()}-${randomUUID().slice(0, 8)}`;
let userId = '';
let concertId = '';

const eventPublisher: IOrderEventPublisher = {
  publishAll: async () => undefined,
};

const orderRepository = new PrismaOrderRepository(prisma as never);
const inventoryRepository = new PrismaInventoryReservationRepository(prisma as never);
const ticketRepository = new PrismaTicketRepository(prisma as never);
const paymentRepository = new PrismaPaymentRepository(prisma as never);
const recoveryRepository = new PrismaPaymentRecoveryRepository(prisma as never);
const transitionOrderStatus = new TransitionOrderStatusUseCase(
  orderRepository,
  eventPublisher,
  inventoryRepository,
);
const issueTickets = new IssueTicketsForPaidOrderUseCase(
  ticketRepository,
  new QrTicketTokenService('paid-order-recovery-integration-secret'),
);
const finalizer = new FinalizeSuccessfulPaymentUseCase(
  paymentRepository,
  recoveryRepository,
  transitionOrderStatus,
  issueTickets,
);

interface Fixture {
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  paymentId: string;
  ticketTypeId: string;
  quantity: number;
}

beforeAll(async () => {
  if (process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true') return;

  const user = await prisma.user.create({
    data: {
      email: `${nonce}@ticketbox.test`,
      passwordHash: 'integration-test',
      displayName: 'Paid Recovery Integration',
    },
  });
  userId = user.id;

  const concert = await prisma.concert.create({
    data: {
      slug: nonce,
      title: 'Paid Order Recovery Integration',
      artistName: 'Integration Artist',
      venueName: 'Integration Venue',
      city: 'HCMC',
      startsAt: new Date('2099-06-25T12:00:00.000Z'),
      endsAt: new Date('2099-06-25T15:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      createdById: userId,
    },
  });
  concertId = concert.id;
});

afterAll(async () => {
  if (!(process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true')) {
    const orders = await prisma.order.findMany({
      where: { orderNumber: { startsWith: nonce } },
      select: { id: true },
    });
    const orderIds = orders.map(({ id }) => id);

    await prisma.paymentEvent.deleteMany({
      where: { payment: { orderId: { in: orderIds } } },
    });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.ticketType.deleteMany({ where: { concertId } });
    await prisma.concert.deleteMany({ where: { id: concertId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe('paid-order recovery PostgreSQL integration', () => {
  runWithDb(
    'repair completes SUCCEEDED + PENDING_PAYMENT and repeated recovery is idempotent',
    async () => {
      const fixture = await createFixture({ quantity: 2 });
      const repair = createScopedRepair(fixture.paymentId);

      await expect(repair.execute({ limit: 10 })).resolves.toMatchObject({
        scanned: 1,
        completed: 1,
        retryable: 0,
        terminal: 0,
      });

      await assertFulfilled(fixture, { reserved: 0, sold: 2, tickets: 2 });

      const results = await Promise.all([
        finalizer.execute({
          paymentId: fixture.paymentId,
          source: SuccessfulPaymentRecoverySource.CALLBACK,
        }),
        finalizer.execute({
          paymentId: fixture.paymentId,
          source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
        }),
      ]);

      expect(
        results.every(
          ({ outcome }) =>
            outcome === SuccessfulPaymentFinalizationOutcome.ALREADY_COMPLETE,
        ),
      ).toBe(true);
      await expect(repair.execute({ limit: 10 })).resolves.toMatchObject({
        scanned: 1,
        completed: 0,
        alreadyComplete: 1,
        retryable: 0,
        terminal: 0,
      });
      await assertFulfilled(fixture, { reserved: 0, sold: 2, tickets: 2 });
    },
    30_000,
  );

  runWithDb(
    'callback and repair concurrently complete only missing deterministic tickets',
    async () => {
      const fixture = await createFixture({
        quantity: 3,
        orderStatus: PrismaOrderStatus.PAID,
        reservedQuantity: 0,
        soldQuantity: 3,
      });
      const existingTicketId = randomUUID();
      const existingHash = `existing-${randomUUID()}`;
      await prisma.ticket.create({
        data: {
          id: existingTicketId,
          ticketNumber: `TCK-${fixture.orderNumber}-001`,
          orderId: fixture.orderId,
          orderItemId: fixture.orderItemId,
          userId,
          concertId,
          ticketTypeId: fixture.ticketTypeId,
          qrTokenHash: existingHash,
          status: TicketStatus.ISSUED,
        },
      });

      const repair = createScopedRepair(fixture.paymentId);
      await Promise.all([
        repair.execute({ limit: 10 }),
        finalizer.execute({
          paymentId: fixture.paymentId,
          source: SuccessfulPaymentRecoverySource.CALLBACK,
        }),
      ]);

      await assertFulfilled(fixture, { reserved: 0, sold: 3, tickets: 3 });
      await expect(
        prisma.ticket.findUniqueOrThrow({ where: { id: existingTicketId } }),
      ).resolves.toMatchObject({
        ticketNumber: `TCK-${fixture.orderNumber}-001`,
        qrTokenHash: existingHash,
      });
    },
    30_000,
  );

  runWithDb(
    'successful payment finalization wins against concurrent expiration',
    async () => {
      const fixture = await createFixture({
        quantity: 1,
        reservationExpiresAt: new Date(Date.now() - 60_000),
      });
      const expiredAt = new Date();

      const [finalization, expiration] = await Promise.allSettled([
        finalizer.execute({
          paymentId: fixture.paymentId,
          source: SuccessfulPaymentRecoverySource.CALLBACK,
        }),
        inventoryRepository.applyStatusTransition({
          orderId: fixture.orderId,
          expectedStatus: OrderStatus.PENDING_PAYMENT,
          nextStatus: OrderStatus.EXPIRED,
          updatedAt: expiredAt,
          paidAt: null,
          expiredAt,
          cancelledAt: null,
        }),
      ]);

      expect(finalization.status).toBe('fulfilled');
      expect(expiration.status).toBe('rejected');
      if (expiration.status === 'rejected') {
        expect(
          expiration.reason instanceof PaidOrderExpirationSkippedError ||
            expiration.reason instanceof OrderConflictError,
        ).toBe(true);
      }
      await assertFulfilled(fixture, { reserved: 0, sold: 1, tickets: 1 });
    },
    30_000,
  );

  runWithDb(
    'reservation conflict stops recovery without changing order, sold inventory, or tickets',
    async () => {
      const fixture = await createFixture({
        quantity: 1,
        reservedQuantity: 0,
      });

      const result = await finalizer.execute({
        paymentId: fixture.paymentId,
        source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
      });

      expect(result).toMatchObject({
        outcome: SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
        reason: InventoryReservationConflictError.name,
      });
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId } }),
      ).resolves.toMatchObject({ status: PrismaOrderStatus.PENDING_PAYMENT });
      await assertInventoryAndTickets(fixture, {
        reserved: 0,
        sold: 0,
        tickets: 0,
      });
    },
    30_000,
  );
});

function createScopedRepair(paymentId: string): RepairSuccessfulPaymentsUseCase {
  const scopedRepository: PaymentRecoveryRepositoryPort = {
    findState: (id) => recoveryRepository.findState(id),
    findCandidatePaymentIds: async () => [paymentId],
  };
  return new RepairSuccessfulPaymentsUseCase(scopedRepository, finalizer);
}

async function createFixture(options: {
  quantity: number;
  orderStatus?: PrismaOrderStatus;
  reservedQuantity?: number;
  soldQuantity?: number;
  reservationExpiresAt?: Date;
}): Promise<Fixture> {
  const id = randomUUID();
  const quantity = options.quantity;
  const orderStatus = options.orderStatus ?? PrismaOrderStatus.PENDING_PAYMENT;
  const ticketType = await prisma.ticketType.create({
    data: {
      concertId,
      code: `REC-${id.slice(0, 8)}`,
      name: `Recovery ${id.slice(0, 8)}`,
      priceVnd: 100_000,
      totalQuantity: 20,
      reservedQuantity: options.reservedQuantity ?? quantity,
      soldQuantity: options.soldQuantity ?? 0,
      maxPerUser: 20,
      saleStartsAt: new Date('2020-01-01T00:00:00.000Z'),
      saleEndsAt: new Date('2099-01-01T00:00:00.000Z'),
    },
  });
  const orderNumber = `${nonce}-${id.slice(0, 8)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      concertId,
      status: orderStatus,
      totalAmountVnd: 100_000 * quantity,
      reservationExpiresAt:
        options.reservationExpiresAt ?? new Date(Date.now() + 15 * 60_000),
      paidAt: orderStatus === PrismaOrderStatus.PAID ? new Date() : null,
    },
  });
  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      ticketTypeId: ticketType.id,
      quantity,
      unitPriceVnd: 100_000,
      totalPriceVnd: 100_000 * quantity,
    },
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      userId,
      provider: 'SIMULATOR',
      providerTransactionId: `recovery-${id}`,
      status: PrismaPaymentStatus.SUCCEEDED,
      amountVnd: 100_000 * quantity,
      completedAt: new Date(),
    },
  });

  return {
    orderId: order.id,
    orderNumber,
    orderItemId: orderItem.id,
    paymentId: payment.id,
    ticketTypeId: ticketType.id,
    quantity,
  };
}

async function assertFulfilled(
  fixture: Fixture,
  expected: { reserved: number; sold: number; tickets: number },
): Promise<void> {
  await expect(
    prisma.order.findUniqueOrThrow({ where: { id: fixture.orderId } }),
  ).resolves.toMatchObject({ status: PrismaOrderStatus.PAID });
  await assertInventoryAndTickets(fixture, expected);
}

async function assertInventoryAndTickets(
  fixture: Fixture,
  expected: { reserved: number; sold: number; tickets: number },
): Promise<void> {
  await expect(
    prisma.ticketType.findUniqueOrThrow({ where: { id: fixture.ticketTypeId } }),
  ).resolves.toMatchObject({
    reservedQuantity: expected.reserved,
    soldQuantity: expected.sold,
  });
  await expect(
    prisma.ticket.count({ where: { orderId: fixture.orderId } }),
  ).resolves.toBe(expected.tickets);
}
