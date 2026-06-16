import { randomBytes, randomUUID } from 'node:crypto';

import { TicketTypeNotFoundError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import type { TicketTypePricingRepositoryPort } from '../../domain/ports/ticket-type-pricing.port';

export interface CreateOrderItemCommand {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateOrderCommand {
  userId: string;
  concertId: string;
  idempotencyKey: string;
  items: CreateOrderItemCommand[];
}

export interface CreateOrderUseCaseOptions {
  reservationTtlMinutes: number;
  now?: () => Date;
}

export class CreateOrderUseCase {
  private readonly reservationTtlMinutes: number;
  private readonly now: () => Date;

  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly ticketTypePricingRepository: TicketTypePricingRepositoryPort,
    options: CreateOrderUseCaseOptions,
  ) {
    this.reservationTtlMinutes = options.reservationTtlMinutes;
    this.now = options.now ?? (() => new Date());
  }

  async execute(command: CreateOrderCommand): Promise<Order> {
    const existingOrder = await this.orderRepository.findByUserIdAndIdempotencyKey(
      command.userId,
      command.idempotencyKey,
    );

    if (existingOrder) {
      return existingOrder;
    }

    const createdAt = this.now();
    const ticketTypeIds = command.items.map((item) => item.ticketTypeId);
    const pricingRecords =
      await this.ticketTypePricingRepository.findPricingByConcertAndTicketTypeIds(
        command.concertId,
        ticketTypeIds,
      );
    const pricingByTicketTypeId = new Map(
      pricingRecords.map((pricing) => [pricing.ticketTypeId, pricing.unitPriceVnd]),
    );
    const items = command.items.map(
      (item) => {
        const unitPriceVnd = pricingByTicketTypeId.get(item.ticketTypeId);
        if (unitPriceVnd === undefined) {
          throw new TicketTypeNotFoundError(command.concertId, item.ticketTypeId);
        }

        return new OrderItem({
          id: randomUUID(),
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          unitPriceVnd,
          totalPriceVnd: item.quantity * unitPriceVnd,
        });
      },
    );

    const order = new Order({
      id: randomUUID(),
      orderNumber: this.generateOrderNumber(createdAt),
      userId: command.userId,
      concertId: command.concertId,
      idempotencyKey: command.idempotencyKey,
      status: OrderStatus.PENDING_PAYMENT,
      totalAmountVnd: items.reduce((total, item) => total + item.totalPriceVnd, 0),
      reservationExpiresAt: this.addReservationTtl(createdAt),
      createdAt,
      updatedAt: createdAt,
      items,
    });

    return this.orderRepository.create(order);
  }

  private addReservationTtl(now: Date): Date {
    return new Date(now.getTime() + this.reservationTtlMinutes * 60 * 1000);
  }

  private generateOrderNumber(now: Date): string {
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const randomSuffix = randomBytes(4)
      .toString('base64url')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 6)
      .padEnd(6, '0');

    return `ORD-${yyyy}${mm}${dd}-${randomSuffix}`;
  }
}
