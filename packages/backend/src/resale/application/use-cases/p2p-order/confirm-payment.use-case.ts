import { Injectable, Inject } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../../domain/ports/event-publisher.port';
import * as errors from '../../../domain/errors';

export interface ConfirmPaymentCommand {
  orderId: string;
  buyerId: string;
  paymentProofUrl: string;
}

@Injectable()
export class ConfirmPaymentUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(command: ConfirmPaymentCommand) {
    if (!command.paymentProofUrl) {
      throw new errors.PaymentProofRequiredError();
    }

    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new errors.OrderNotFoundError();
    }

    if (order.buyerId !== command.buyerId) {
      throw new errors.NotOrderBuyerError();
    }

    if (order.status !== 'RESERVED') {
      throw new errors.InvalidOrderStateError();
    }

    const updated = await this.orderRepo.updateStatus(order.id, 'PENDING_CONFIRM', {
      paymentProofUrl: command.paymentProofUrl,
      paymentConfirmedAt: new Date()
    });

    // Enqueue expiry job (2 hours)
    await this.eventPublisher.publish(
      'expire-confirm-order',
      { orderId: order.id },
      { delay: 2 * 60 * 60 * 1000 }
    );

    // TODO: Notify seller

    return updated;
  }
}
