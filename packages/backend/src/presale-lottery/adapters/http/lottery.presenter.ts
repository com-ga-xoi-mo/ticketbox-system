import type {
  ConfigureLotteryResponse,
  LotteryRegistrationListResponse,
  LotteryStatusResponse,
  WithdrawLotteryResponse,
} from '@ticketbox/api-types';

import type {
  LotteryConfigRecord,
  LotteryRegistrationListItem,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
} from '../../domain/lottery.types';

export function serializeLotteryStatus(
  status: LotteryStatusRecord,
  ticketTypeId: string,
): LotteryStatusResponse {
  return {
    ticketTypeId,
    registrationId: status.registration?.id ?? null,
    registrationStatus: status.registration?.status ?? null,
    desiredQuantity: status.registration?.desiredQuantity ?? null,
    configStatus: status.config?.status ?? null,
    registrationOpensAt: status.config?.registrationOpensAt.toISOString() ?? null,
    registrationClosesAt: status.config?.registrationClosesAt.toISOString() ?? null,
    drawAt: status.config?.drawAt.toISOString() ?? null,
    entitlement: status.entitlement
      ? {
          id: status.entitlement.id,
          status: status.entitlement.status,
          quantity: status.entitlement.quantity,
          expiresAt: status.entitlement.expiresAt.toISOString(),
          grantedAt: status.entitlement.grantedAt.toISOString(),
        }
      : null,
  };
}

export function serializeWithdraw(
  registration: LotteryRegistrationRecord,
): WithdrawLotteryResponse {
  return {
    registrationId: registration.id,
    status: registration.status,
  };
}

export function serializeConfig(config: LotteryConfigRecord): ConfigureLotteryResponse {
  return {
    ticketTypeId: config.ticketTypeId,
    status: config.status,
    registrationOpensAt: config.registrationOpensAt.toISOString(),
    registrationClosesAt: config.registrationClosesAt.toISOString(),
    drawAt: config.drawAt.toISOString(),
    allocation: config.allocation,
    entitlementTtlMinutes: config.entitlementTtlMinutes,
  };
}

export function serializeRegistrationList(
  ticketTypeId: string,
  registrations: LotteryRegistrationListItem[],
): LotteryRegistrationListResponse {
  return {
    ticketTypeId,
    registrations: registrations.map((registration) => ({
      registrationId: registration.id,
      userId: registration.userId,
      userEmail: registration.userEmail,
      userDisplayName: registration.userDisplayName,
      desiredQuantity: registration.desiredQuantity,
      status: registration.status,
      registeredAt: registration.registeredAt.toISOString(),
      wonAt: registration.wonAt?.toISOString() ?? null,
      notSelectedAt: registration.notSelectedAt?.toISOString() ?? null,
      withdrawnAt: registration.withdrawnAt?.toISOString() ?? null,
      fulfilledAt: registration.fulfilledAt?.toISOString() ?? null,
      entitlement: registration.entitlement
        ? {
            id: registration.entitlement.id,
            status: registration.entitlement.status,
            quantity: registration.entitlement.quantity,
            expiresAt: registration.entitlement.expiresAt.toISOString(),
            grantedAt: registration.entitlement.grantedAt.toISOString(),
            orderId: registration.entitlement.orderId,
            consumedAt: registration.entitlement.consumedAt?.toISOString() ?? null,
          }
        : null,
    })),
  };
}
