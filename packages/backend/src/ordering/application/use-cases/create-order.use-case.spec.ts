import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketTypeNotFoundError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IInventoryReservationRepository } from '../../domain/ports/inventory-reservation.port';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import type { PromotionValidationPort } from '../../domain/ports/promotion-validation.port';
import type { TicketTypePricingRepositoryPort } from '../../domain/ports/ticket-type-pricing.port';
import type { WaitingRoomAdmissionPort } from '../../domain/ports/waiting-room-admission.port';
import { CreateOrderUseCase } from './create-order.use-case';

function buildOrder(overrides: Partial<ConstructorParameters<typeof Order>[0]> = {}): Order {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmountVnd: 300000,
    reservationExpiresAt: new Date('2026-06-16T10:15:00.000Z'),
    createdAt: new Date('2026-06-16T10:00:00.000Z'),
    updatedAt: new Date('2026-06-16T10:00:00.000Z'),
    ...overrides,
  });
}

function buildRepository(): IOrderRepository {
  return {
    create: vi.fn(async (order: Order) => order),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdAndIdempotencyKey: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function buildPricingRepository(): TicketTypePricingRepositoryPort {
  return {
    findPricingByConcertAndTicketTypeIds: vi.fn(),
  };
}

function buildInventoryReservationRepository(): IInventoryReservationRepository {
  return {
    reserve: vi.fn(async (order: Order) => order),
  };
}

function buildWaitingRoomAdmissionPort(): WaitingRoomAdmissionPort {
  return {
    incrementLoad: vi.fn(async () => undefined),
    validate: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
  };
}

function buildPromotionValidationPort(): PromotionValidationPort {
  return {
    validate: vi.fn(),
  };
}

describe('CreateOrderUseCase', () => {
  let orderRepository: IOrderRepository;
  let inventoryReservationRepository: IInventoryReservationRepository;
  let ticketTypePricingRepository: TicketTypePricingRepositoryPort;
  let waitingRoomAdmissionPort: WaitingRoomAdmissionPort;
  let useCase: CreateOrderUseCase;
  const now = new Date('2026-06-16T10:00:00.000Z');

  beforeEach(() => {
    orderRepository = buildRepository();
    inventoryReservationRepository = buildInventoryReservationRepository();
    ticketTypePricingRepository = buildPricingRepository();
    waitingRoomAdmissionPort = buildWaitingRoomAdmissionPort();
    useCase = new CreateOrderUseCase(
      orderRepository,
      inventoryReservationRepository,
      ticketTypePricingRepository,
      buildPromotionValidationPort(),
      waitingRoomAdmissionPort,
      {
        serviceFeeVnd: 0,
        reservationTtlMinutes: 15,
        now: () => now,
      },
    );
  });

  it('creates a pending-payment order', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([{ ticketTypeName: 'Mock 1', ticketTypeId: 'ticket-type-1', concertId: 'concert-1', unitPriceVnd: 150000 }]);

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
    });

    expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(result.userId).toBe('user-1');
    expect(result.concertId).toBe('concert-1');
    expect(result.idempotencyKey).toBe('idem-1');
    expect(inventoryReservationRepository.reserve).toHaveBeenCalledWith(
      expect.any(Order),
      { waitlistEntitlementId: undefined },
    );
    expect(waitingRoomAdmissionPort.incrementLoad).toHaveBeenCalledWith('concert-1');
    expect(waitingRoomAdmissionPort.validate).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
      token: undefined,
    });
    expect(waitingRoomAdmissionPort.release).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
    });
  });

  it('generates an order number with the expected format', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([{ ticketTypeName: 'Mock 1', ticketTypeId: 'ticket-type-1', concertId: 'concert-1', unitPriceVnd: 150000 }]);

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(result.orderNumber).toMatch(/^ORD-20260616-[A-Z0-9]{6}$/);
  });

  it('calculates item totals and order total', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([
      { ticketTypeName: 'Mock 1', ticketTypeId: 'ticket-type-1', concertId: 'concert-1', unitPriceVnd: 150000 },
      { ticketTypeName: 'Mock 2', ticketTypeId: 'ticket-type-2', concertId: 'concert-1', unitPriceVnd: 250000 },
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [
        { ticketTypeId: 'ticket-type-1', quantity: 2 },
        { ticketTypeId: 'ticket-type-2', quantity: 1 },
      ],
    });

    expect(result.totalAmountVnd).toBe(550000);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ totalPriceVnd: 300000 });
    expect(result.items[1]).toMatchObject({ totalPriceVnd: 250000 });
  });

  it('returns an existing order when idempotency key was already used by the user', async () => {
    const existingOrder = buildOrder();
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(
      existingOrder,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(result).toBe(existingOrder);
    expect(inventoryReservationRepository.reserve).not.toHaveBeenCalled();
    expect(waitingRoomAdmissionPort.incrementLoad).not.toHaveBeenCalled();
    expect(waitingRoomAdmissionPort.validate).not.toHaveBeenCalled();
    expect(waitingRoomAdmissionPort.release).not.toHaveBeenCalled();
  });

  it('rejects before reserving inventory when waiting-room admission fails', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(waitingRoomAdmissionPort.validate).mockRejectedValue(
      new Error('Waiting room admission is required for concert: concert-1'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        concertId: 'concert-1',
        idempotencyKey: 'idem-1',
        waitingRoomAdmissionToken: 'bad-token',
        items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
      }),
    ).rejects.toThrow('Waiting room admission is required');

    expect(inventoryReservationRepository.reserve).not.toHaveBeenCalled();
  });

  it('validates the supplied waiting-room token before reserving and releases the admitted slot', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([
      {
        ticketTypeName: 'Mock 1',
        ticketTypeId: 'ticket-type-1',
        concertId: 'concert-1',
        unitPriceVnd: 150000,
      },
    ]);

    await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      waitingRoomAdmissionToken: 'admission-token-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(waitingRoomAdmissionPort.incrementLoad).toHaveBeenCalledWith('concert-1');
    expect(waitingRoomAdmissionPort.validate).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
      token: 'admission-token-1',
    });
    expect(inventoryReservationRepository.reserve).toHaveBeenCalledTimes(1);
    expect(waitingRoomAdmissionPort.release).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
    });
  });

  it('keeps waitlist entitlement gating after a valid waiting-room admission', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([
      {
        ticketTypeName: 'Mock 1',
        ticketTypeId: 'ticket-type-1',
        concertId: 'concert-1',
        unitPriceVnd: 150000,
      },
    ]);

    await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      waitlistEntitlementId: 'waitlist-entitlement-1',
      waitingRoomAdmissionToken: 'admission-token-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(waitingRoomAdmissionPort.validate).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
      token: 'admission-token-1',
    });
    expect(inventoryReservationRepository.reserve).toHaveBeenCalledWith(
      expect.any(Order),
      { waitlistEntitlementId: 'waitlist-entitlement-1' },
    );
  });

  it('does not reserve or consume entitlement when waiting-room admission fails', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(waitingRoomAdmissionPort.validate).mockRejectedValue(
      new Error('Waiting room admission token is invalid: foreign-token'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        concertId: 'concert-1',
        idempotencyKey: 'idem-1',
        waitlistEntitlementId: 'waitlist-entitlement-1',
        waitingRoomAdmissionToken: 'foreign-token',
        items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
      }),
    ).rejects.toThrow('Waiting room admission token is invalid');

    expect(inventoryReservationRepository.reserve).not.toHaveBeenCalled();
    expect(waitingRoomAdmissionPort.release).not.toHaveBeenCalled();
  });

  it('does not fail checkout if waiting-room slot release fails after reservation succeeds', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([
      {
        ticketTypeName: 'Mock 1',
        ticketTypeId: 'ticket-type-1',
        concertId: 'concert-1',
        unitPriceVnd: 150000,
      },
    ]);
    vi.mocked(waitingRoomAdmissionPort.release).mockRejectedValue(
      new Error('Redis release failed'),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      waitingRoomAdmissionToken: 'admission-token-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(inventoryReservationRepository.reserve).toHaveBeenCalledTimes(1);
  });

  it('sets reservationExpiresAt from the configured TTL', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([{ ticketTypeName: 'Mock 1', ticketTypeId: 'ticket-type-1', concertId: 'concert-1', unitPriceVnd: 150000 }]);

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 1 }],
    });

    expect(result.reservationExpiresAt).toEqual(
      new Date('2026-06-16T10:15:00.000Z'),
    );
  });

  it('throws when a requested ticket type does not belong to the concert', async () => {
    vi.mocked(orderRepository.findByUserIdAndIdempotencyKey).mockResolvedValue(null);
    vi.mocked(
      ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds,
    ).mockResolvedValue([]);

    await expect(
      useCase.execute({
        userId: 'user-1',
        concertId: 'concert-1',
        idempotencyKey: 'idem-1',
        items: [{ ticketTypeId: 'missing-ticket-type', quantity: 1 }],
      }),
    ).rejects.toThrow(TicketTypeNotFoundError);
  });
});
