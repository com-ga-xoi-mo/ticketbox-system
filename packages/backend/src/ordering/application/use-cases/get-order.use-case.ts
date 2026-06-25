import { OrderNotFoundError } from '../../domain/errors';
import type { Order } from '../../domain/order.entity';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';

export interface GetOrderCommand {
  userId: string;
  orderId: string;
}

export class GetOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(command: GetOrderCommand): Promise<Order> {
    const order = await this.orderRepository.findById(command.orderId);

    if (!order || order.userId !== command.userId) {
      throw new OrderNotFoundError(command.orderId);
    }

    return order;
  }
}
