export const TICKET_TRANSFER_REPOSITORY = 'TICKET_TRANSFER_REPOSITORY';

export interface CreateTransferData {
  ticketId: string;
  senderId: string;
  recipientEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface TicketTransferRecord {
  id: string;
  ticketId: string;
  senderId: string;
  recipientEmail: string;
  tokenHash: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketTransferRepository {
  /**
   * Finds an active pending transfer for a specific ticket.
   */
  findPendingTransferByTicketId(ticketId: string): Promise<TicketTransferRecord | null>;

  /**
   * Atomically creates a pending transfer and updates the ticket status to TRANSFER_PENDING.
   */
  createTransfer(data: CreateTransferData): Promise<TicketTransferRecord>;
}
