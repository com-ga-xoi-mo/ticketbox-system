export const PURCHASE_CONFIRMATION_READ_PORT = Symbol('PurchaseConfirmationReadPort');

/**
 * Confirmation payload data for a paid order, assembled from order, user, and
 * concert tables owned by other modules. Returned by the infrastructure adapter
 * so the notification module never imports ordering / identity / concert-management
 * Prisma models directly.
 */
export interface OrderPaidNotificationData {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  concertId: string;
  concertTitle: string;
  startsAt: Date;
  ticketCount: number;
}

export interface PurchaseConfirmationReadPort {
  /**
   * Returns the confirmation payload for a paid order, or `null` when the order
   * does not exist or has no issued tickets.
   */
  findOrderPaidNotificationData(orderId: string): Promise<OrderPaidNotificationData | null>;
}
