import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketTypeNotFoundError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IInventoryReservationRepository } from '../../domain/ports/inventory-reservation.port';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import type { TicketTypePricingRepositoryPort } from '../../domain/ports/ticket-type-pricing.port';
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

describe('CreateOrderUseCase', () => {
  let orderRepository: IOrderRepository;
  let inventoryReservationRepository: IInventoryReservationRepository;
  let ticketTypePricingRepository: TicketTypePricingRepositoryPort;
  let useCase: CreateOrderUseCase;
  const now = new Date('2026-06-16T10:00:00.000Z');

  beforeEach(() => {
    orderRepository = buildRepository();
    inventoryReservationRepository = buildInventoryReservationRepository();
    ticketTypePricingRepository = buildPricingRepository();
    useCase = new CreateOrderUseCase(
      orderRepository,
      inventoryReservationRepository,
      ticketTypePricingRepository,
      {
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
    );
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
