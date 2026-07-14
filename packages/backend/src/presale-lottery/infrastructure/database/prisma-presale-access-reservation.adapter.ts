import { Injectable } from '@nestjs/common';

import {
  PresaleAccessQuantityExceededError,
  PresaleAccessRequiredError,
} from '../../../ordering/domain/errors';
import type {
  PresaleAccessReservationPort,
  PresaleAccessReservationRequest,
} from '../../../ordering/domain/ports/presale-access-reservation.port';

/**
 * Presale-access guard: for a ticket type inside its presale lottery gate window
 * (`presaleGateOpensAt <= now < presaleGateClosesAt`), only a lottery winner with remaining
 * won quantity may buy, and the purchased quantity is recorded atomically in the reservation
 * transaction. Outside the window the ticket type is an ordinary public-pool ticket (no-op).
 */
@Injectable()
export class PrismaPresaleAccessReservationAdapter
  implements PresaleAccessReservationPort<any>
{
  async validateAndRecordForReservation(
    tx: any,
    request: PresaleAccessReservationRequest,
  ): Promise<void> {
    const requestedByTicketType = new Map<string, number>();
    for (const item of request.items) {
      requestedByTicketType.set(
        item.ticketTypeId,
        (requestedByTicketType.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }

    for (const [ticketTypeId, requestedQty] of requestedByTicketType) {
      const ticketType = await tx.ticketType.findUnique({
        where: { id: ticketTypeId },
        select: { presaleGateOpensAt: true, presaleGateClosesAt: true },
      });
      const inPresaleWindow = Boolean(
        ticketType?.presaleGateOpensAt &&
          ticketType.presaleGateClosesAt &&
          ticketType.presaleGateOpensAt <= request.now &&
          request.now < ticketType.presaleGateClosesAt,
      );
      if (!inPresaleWindow) continue;

      // Lock the winner's registration row so concurrent orders cannot exceed the won quantity.
      const rows = (await tx.$queryRawUnsafe(
        `SELECT id, won_quantity AS "wonQuantity", purchased_quantity AS "purchasedQuantity"
         FROM lottery_registrations
         WHERE user_id = $1::uuid AND ticket_type_id = $2::uuid AND status = 'WON'
         FOR UPDATE`,
        request.userId,
        ticketTypeId,
      )) as Array<{ id: string; wonQuantity: number; purchasedQuantity: number }>;
      const registration = rows[0];
      if (!registration) {
        throw new PresaleAccessRequiredError(ticketTypeId);
      }

      const remaining = registration.wonQuantity - registration.purchasedQuantity;
      if (requestedQty > remaining) {
        throw new PresaleAccessQuantityExceededError(ticketTypeId, remaining, requestedQty);
      }

      const newPurchased = registration.purchasedQuantity + requestedQty;
      await tx.lotteryRegistration.update({
        where: { id: registration.id },
        data: {
          purchasedQuantity: newPurchased,
          fulfilledAt: newPurchased >= registration.wonQuantity ? request.now : undefined,
        },
      });
    }
  }
}
