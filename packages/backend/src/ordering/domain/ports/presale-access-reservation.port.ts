export const PRESALE_ACCESS_RESERVATION_PORT = Symbol('PresaleAccessReservationPort');

export interface PresaleAccessReservationRequest {
  userId: string;
  concertId: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  orderId: string;
  now: Date;
}

/**
 * Guards checkout for ticket types inside a presale lottery gate window.
 * Implemented by the presale-lottery module (ordering stays decoupled from lottery tables).
 * For a gated ticket type, it validates that the requesting user is a lottery winner with
 * remaining won quantity and records the purchased quantity atomically inside the reservation
 * transaction. It is a no-op for ticket types that are not inside a presale window.
 */
export interface PresaleAccessReservationPort<TTransaction = unknown> {
  validateAndRecordForReservation(
    tx: TTransaction,
    request: PresaleAccessReservationRequest,
  ): Promise<void>;
}
