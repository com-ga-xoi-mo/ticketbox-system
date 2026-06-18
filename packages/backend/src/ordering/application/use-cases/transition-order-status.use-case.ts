import { OrderAccessDeniedError, OrderNotFoundError } from '../../domain/errors';
import type { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IInventoryAdjustmentRepository } from '../../domain/ports/inventory-adjustment.port';
import type { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';

export interface TransitionOrderStatusCommand {
  orderId: string;
  status: OrderStatus;
  userId?: string;
  skipOwnershipCheck?: boolean;
  occurredAt?: Date;
}

export class TransitionOrderStatusUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderEventPublisher: IOrderEventPublisher,
    private readonly inventoryAdjustmentRepository?: IInventoryAdjustmentRepository,
  ) {}

  async execute(command: TransitionOrderStatusCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order) {
      throw new OrderNotFoundError(command.orderId);
    }

    if (command.skipOwnershipCheck !== true) {
      if (!command.userId || order.userId !== command.userId) {
        throw new OrderAccessDeniedError(command.orderId, command.userId ?? 'unknown');
      }
    }

    const expectedStatus = order.status;
    order.transition(command.status, command.occurredAt);

    const updatedOrder =
      this.requiresInventoryAdjustment(expectedStatus, order.status) &&
      this.inventoryAdjustmentRepository
        ? await this.inventoryAdjustmentRepository.applyStatusTransition({
            orderId: order.id,
            expectedStatus,
            nextStatus: order.status,
            updatedAt: order.updatedAt,
            paidAt: order.paidAt,
            expiredAt: order.expiredAt,
            cancelledAt: order.cancelledAt,
          })
        : await this.orderRepository.updateStatus({
            orderId: order.id,
            expectedStatus,
            nextStatus: order.status,
            updatedAt: order.updatedAt,
            paidAt: order.paidAt,
            expiredAt: order.expiredAt,
            cancelledAt: order.cancelledAt,
          });

    await this.orderEventPublisher.publishAll(order.domainEvents);
    order.clearEvents();

    return updatedOrder;
  }

  private requiresInventoryAdjustment(
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): boolean {
    return (
      expectedStatus === OrderStatus.PENDING_PAYMENT &&
      [
        OrderStatus.PAID,
        OrderStatus.EXPIRED,
        OrderStatus.FAILED,
        OrderStatus.CANCELLED,
      ].includes(nextStatus)
    );
  }
}
