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
    wonQuantity: status.registration?.wonQuantity ?? null,
    purchasedQuantity: status.registration?.purchasedQuantity ?? null,
    remainingWonQuantity: status.registration
      ? Math.max(status.registration.wonQuantity - status.registration.purchasedQuantity, 0)
      : null,
    configStatus: status.config?.status ?? null,
    registrationOpensAt: status.config?.registrationOpensAt.toISOString() ?? null,
    registrationClosesAt: status.config?.registrationClosesAt.toISOString() ?? null,
    drawAt: status.config?.drawAt.toISOString() ?? null,
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
      wonQuantity: registration.wonQuantity,
      purchasedQuantity: registration.purchasedQuantity,
      remainingWonQuantity: Math.max(
        registration.wonQuantity - registration.purchasedQuantity,
        0,
      ),
      status: registration.status,
      registeredAt: registration.registeredAt.toISOString(),
      wonAt: registration.wonAt?.toISOString() ?? null,
      notSelectedAt: registration.notSelectedAt?.toISOString() ?? null,
      withdrawnAt: registration.withdrawnAt?.toISOString() ?? null,
      fulfilledAt: registration.fulfilledAt?.toISOString() ?? null,
    })),
  };
}
