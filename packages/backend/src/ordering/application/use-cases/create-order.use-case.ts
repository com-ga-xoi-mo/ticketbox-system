import { randomBytes, randomUUID } from 'node:crypto';

import { TicketTypeNotFoundError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import type { IInventoryReservationRepository } from '../../domain/ports/inventory-reservation.port';
import type { TicketTypePricingRepositoryPort } from '../../domain/ports/ticket-type-pricing.port';

export interface CreateOrderItemCommand {
  ticketTypeId: string;
  quantity: number;
}

import type { PromotionValidationPort } from '../../domain/ports/promotion-validation.port';

export interface CreateOrderCommand {
  promoCode?: string;
  userId: string;
  concertId: string;
  idempotencyKey: string;
  items: CreateOrderItemCommand[];
}

export interface CreateOrderUseCaseOptions {
  serviceFeeVnd: number;
  reservationTtlMinutes: number;
  now?: () => Date;
}

export class CreateOrderUseCase {
  private readonly reservationTtlMinutes: number;
  private readonly serviceFeeVnd: number;
  private readonly now: () => Date;

  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly inventoryReservationRepository: IInventoryReservationRepository,
    private readonly ticketTypePricingRepository: TicketTypePricingRepositoryPort,
    private readonly promotionValidationPort: PromotionValidationPort,
    options: CreateOrderUseCaseOptions,
  ) {
    this.reservationTtlMinutes = options.reservationTtlMinutes;
    this.serviceFeeVnd = options.serviceFeeVnd;
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
      pricingRecords.map((pricing) => [pricing.ticketTypeId, pricing]),
    );
    
    let discountAmountVnd = 0;
    let promoCode: string | null = null;
    let promotionId: string | null = null;

    if (command.promoCode) {
      const validationResult = await this.promotionValidationPort.validate(
        command.promoCode,
        command.userId,
        command.concertId,
        ticketTypeIds,
      );

      if (validationResult.valid) {
        promoCode = command.promoCode;
        promotionId = validationResult.promotionId ?? null;
        
        // Compute subtotal before applying discount
        const subtotalVnd = command.items.reduce((total, item) => {
          const pricing = pricingByTicketTypeId.get(item.ticketTypeId);
          return total + (item.quantity * (pricing?.unitPriceVnd ?? 0));
        }, 0);

        if (validationResult.discountType === 'PERCENTAGE') {
          discountAmountVnd = Math.floor((subtotalVnd * (validationResult.discountValue ?? 0)) / 100);
          if ((validationResult.maxDiscountVnd ?? null) !== null && discountAmountVnd > validationResult.maxDiscountVnd!) {
            discountAmountVnd = validationResult.maxDiscountVnd!;
          }
        } else if (validationResult.discountType === 'FIXED_AMOUNT') {
          discountAmountVnd = validationResult.discountValue ?? 0;
        }

        if (discountAmountVnd > subtotalVnd) {
          discountAmountVnd = subtotalVnd;
        }
      }
    }

    const items = command.items.map(
      (item) => {
        const pricing = pricingByTicketTypeId.get(item.ticketTypeId);
        if (pricing === undefined) {
          throw new TicketTypeNotFoundError(command.concertId, item.ticketTypeId);
        }

        return new OrderItem({
          id: randomUUID(),
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: pricing.ticketTypeName,
          quantity: item.quantity,
          unitPriceVnd: pricing.unitPriceVnd,
          totalPriceVnd: item.quantity * pricing.unitPriceVnd,
        });
      },
    );

    const subtotalVnd = items.reduce((total, item) => total + item.totalPriceVnd, 0);
    const totalAmountVnd = subtotalVnd - discountAmountVnd + this.serviceFeeVnd;

    const order = new Order({
      id: randomUUID(),
      orderNumber: this.generateOrderNumber(createdAt),
      userId: command.userId,
      concertId: command.concertId,
      idempotencyKey: command.idempotencyKey,
      status: OrderStatus.PENDING_PAYMENT,
      subtotalVnd,
      discountAmountVnd,
      serviceFeeVnd: this.serviceFeeVnd,
      totalAmountVnd,
      promoCode,
      promotionId,

      reservationExpiresAt: this.addReservationTtl(createdAt),
      createdAt,
      updatedAt: createdAt,
      items,
    });

    return this.inventoryReservationRepository.reserve(order);
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
