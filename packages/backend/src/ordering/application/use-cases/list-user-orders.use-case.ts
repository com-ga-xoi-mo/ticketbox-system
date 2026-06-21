import type { Order } from '../../domain/order.entity';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';

export interface ListUserOrdersCommand {
  userId: string;
}

export class ListUserOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(command: ListUserOrdersCommand): Promise<Order[]> {
    return this.orderRepository.findByUserId(command.userId);
  }
}
