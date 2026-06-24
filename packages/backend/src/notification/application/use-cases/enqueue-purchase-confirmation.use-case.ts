import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';
import type { PurchaseConfirmationQueuePort } from '../../domain/ports/purchase-confirmation-queue.port';
import type { PurchaseConfirmationReadPort } from '../../domain/ports/purchase-confirmation-read.port';

/**
 * Assembles and enqueues the purchase-confirmation job for a newly paid order.
 * Triggered by the ordering paid-order flow after e-tickets are issued.
 */
export class EnqueuePurchaseConfirmationUseCase {
  constructor(
    private readonly readPort: PurchaseConfirmationReadPort,
    private readonly queue: PurchaseConfirmationQueuePort,
    private readonly ticketAccessBaseUrl: string,
  ) {}

  async execute(orderId: string, paidAt: Date): Promise<void> {
    const data = await this.readPort.findOrderPaidNotificationData(orderId);
    if (!data) {
      // Order not found or has no issued tickets — nothing to confirm.
      return;
    }

    const event: OrderPaidForNotification = {
      // Stable id so the producer's jobId dedupes a replayed paid transition.
      eventId: orderId,
      orderId,
      userId: data.userId,
      userEmail: data.userEmail,
      userDisplayName: data.userDisplayName,
      concertId: data.concertId,
      concertTitle: data.concertTitle,
      startsAt: data.startsAt.toISOString(),
      ticketCount: data.ticketCount,
      ticketAccessUrl: this.buildTicketAccessUrl(orderId),
      paidAt: paidAt.toISOString(),
    };

    await this.queue.enqueueOrderPaid(event);
  }

  private buildTicketAccessUrl(orderId: string): string {
    const base = this.ticketAccessBaseUrl.replace(/\/+$/, '');
    return `${base}/orders/${orderId}/tickets`;
  }
}
