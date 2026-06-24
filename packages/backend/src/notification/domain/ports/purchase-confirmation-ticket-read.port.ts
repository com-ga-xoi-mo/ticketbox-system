export const PURCHASE_CONFIRMATION_TICKET_READ_PORT = Symbol('PurchaseConfirmationTicketReadPort');

export interface PurchaseConfirmationTicketData {
  id: string;
  ticketNumber: string;
  orderId: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  concertStartsAt: Date;
  ticketTypeName: string;
  issuedAt: Date;
}

export interface PurchaseConfirmationTicketReadPort {
  findIssuedTicketsByPaidOrderId(orderId: string): Promise<PurchaseConfirmationTicketData[]>;
}
