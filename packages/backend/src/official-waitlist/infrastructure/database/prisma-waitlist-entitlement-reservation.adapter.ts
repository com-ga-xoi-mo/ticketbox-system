import { Injectable } from '@nestjs/common';

import {
  WaitlistEntitlementExpiredError,
  WaitlistEntitlementInvalidError,
  WaitlistEntitlementQuantityExceededError,
  WaitlistEntitlementRequiredError,
} from '../../../ordering/domain/errors';
import type {
  WaitlistEntitlementReservationPort,
  WaitlistEntitlementReservationRequest,
} from '../../../ordering/domain/ports/waitlist-entitlement-reservation.port';

@Injectable()
export class PrismaWaitlistEntitlementReservationAdapter
  implements WaitlistEntitlementReservationPort<any>
{
  async validateAndConsumeForReservation(
    tx: any,
    request: WaitlistEntitlementReservationRequest,
  ): Promise<void> {
    const gatedTicketTypeIds = await this.findGatedTicketTypeIds(tx, request);
    if (gatedTicketTypeIds.length === 0) return;

    if (!request.entitlementId) {
      throw new WaitlistEntitlementRequiredError(gatedTicketTypeIds[0]);
    }

    const entitlementRows = (await tx.$queryRawUnsafe(
      `SELECT id,
              user_id AS "userId",
              concert_id AS "concertId",
              ticket_type_id AS "ticketTypeId",
              status,
              quantity,
              expires_at AS "expiresAt",
              waitlist_entry_id AS "waitlistEntryId"
       FROM purchase_entitlements
       WHERE id = $1::uuid
       FOR UPDATE`,
      request.entitlementId,
    )) as Array<{
      id: string;
      userId: string;
      concertId: string;
      ticketTypeId: string;
      status: string;
      quantity: number;
      expiresAt: Date;
      waitlistEntryId: string | null;
    }>;
    const entitlement = entitlementRows[0];
    if (!entitlement) {
      throw new WaitlistEntitlementInvalidError(request.entitlementId);
    }

    if (
      entitlement.userId !== request.userId ||
      entitlement.concertId !== request.concertId ||
      !gatedTicketTypeIds.includes(entitlement.ticketTypeId) ||
      entitlement.status !== 'ACTIVE'
    ) {
      throw new WaitlistEntitlementInvalidError(request.entitlementId);
    }

    if (entitlement.expiresAt <= request.now) {
      throw new WaitlistEntitlementExpiredError(request.entitlementId);
    }

    const requestedQuantity = request.items
      .filter((item) => item.ticketTypeId === entitlement.ticketTypeId)
      .reduce((total, item) => total + item.quantity, 0);
    if (requestedQuantity > entitlement.quantity) {
      throw new WaitlistEntitlementQuantityExceededError(
        request.entitlementId,
        entitlement.quantity,
        requestedQuantity,
      );
    }

    if (
      gatedTicketTypeIds.some((ticketTypeId) => ticketTypeId !== entitlement.ticketTypeId)
    ) {
      throw new WaitlistEntitlementInvalidError(request.entitlementId);
    }

    await tx.purchaseEntitlement.update({
      where: { id: entitlement.id },
      data: {
        status: 'CONSUMED',
        consumedAt: request.now,
        orderId: request.orderId,
      },
    });

    if (entitlement.waitlistEntryId) {
      await tx.waitlistEntry.update({
        where: { id: entitlement.waitlistEntryId },
        data: {
          status: 'FULFILLED',
          fulfilledAt: request.now,
        },
      });
    }
  }

  private async findGatedTicketTypeIds(
    tx: any,
    request: WaitlistEntitlementReservationRequest,
  ): Promise<string[]> {
    const requestedTicketTypeIds = [...new Set(request.items.map((item) => item.ticketTypeId))];
    const result: string[] = [];

    for (const ticketTypeId of requestedTicketTypeIds) {
      const activeEntries = await tx.waitlistEntry.count({
        where: {
          ticketTypeId,
          status: { in: ['WAITING', 'GRANTED'] },
        },
      });
      const activeEntitlements = await tx.purchaseEntitlement.count({
        where: {
          ticketTypeId,
          status: 'ACTIVE',
          expiresAt: { gt: request.now },
        },
      });
      if (activeEntries + activeEntitlements > 0) {
        result.push(ticketTypeId);
      }
    }

    return result;
  }
}
