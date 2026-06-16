export interface OrderPaidForNotification {
  eventId: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  concertId: string;
  concertTitle: string;
  startsAt: string;
  ticketCount: number;
  ticketAccessUrl: string;
  paidAt: string;
}
