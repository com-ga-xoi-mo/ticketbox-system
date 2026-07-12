import { describe, expect, it, vi } from 'vitest';

import type {
  LotteryConfigRecord,
  LotteryRegistrationListItem,
} from '../../domain/lottery.types';
import { OrganizerLotteryController } from './organizer-lottery.controller';

const TICKET_TYPE_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRATION_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';

const config: LotteryConfigRecord = {
  id: '44444444-4444-4444-4444-444444444444',
  ticketTypeId: TICKET_TYPE_ID,
  concertId: '55555555-5555-5555-5555-555555555555',
  registrationOpensAt: new Date('2026-01-01T00:00:00.000Z'),
  registrationClosesAt: new Date('2026-01-02T00:00:00.000Z'),
  drawAt: new Date('2026-01-03T00:00:00.000Z'),
  allocation: 3,
  entitlementTtlMinutes: 9,
  status: 'SCHEDULED',
  seed: null,
  drawnAt: null,
};

function makeController() {
  const configure = { execute: vi.fn().mockResolvedValue(config) };
  const cancel = { execute: vi.fn().mockResolvedValue(config) };
  const getConfig = { execute: vi.fn().mockResolvedValue(config) };
  const runDraw = { execute: vi.fn().mockResolvedValue({ granted: 1, notSelected: 2 }) };
  const listRegistrations = { execute: vi.fn().mockResolvedValue([]) };
  const updateTtl = { execute: vi.fn().mockResolvedValue({ ...config, entitlementTtlMinutes: 12 }) };

  return {
    controller: new OrganizerLotteryController(
      configure as any,
      cancel as any,
      getConfig as any,
      runDraw as any,
      listRegistrations as any,
      updateTtl as any,
    ),
    configure,
    runDraw,
    listRegistrations,
    updateTtl,
  };
}

describe('OrganizerLotteryController', () => {
  it('passes entitlement TTL to the configure use case', async () => {
    const { controller, configure } = makeController();

    const result = await controller.configure({
      ticketTypeId: TICKET_TYPE_ID,
      registrationOpensAt: '2026-01-01T00:00:00.000Z',
      registrationClosesAt: '2026-01-02T00:00:00.000Z',
      drawAt: '2026-01-03T00:00:00.000Z',
      publicSaleStartsAt: '2026-01-04T00:00:00.000Z',
      allocation: 3,
      entitlementTtlMinutes: 9,
    });

    expect(configure.execute).toHaveBeenCalledWith(
      expect.objectContaining({ entitlementTtlMinutes: 9 }),
    );
    expect(result.entitlementTtlMinutes).toBe(9);
  });

  it('runs the draw now through the shared draw use case', async () => {
    const { controller, runDraw } = makeController();

    const result = await controller.drawNow(TICKET_TYPE_ID);

    expect(runDraw.execute).toHaveBeenCalledWith({ ticketTypeId: TICKET_TYPE_ID });
    expect(result).toEqual({ ticketTypeId: TICKET_TYPE_ID, granted: 1, notSelected: 2 });
  });

  it('updates entitlement TTL through the dedicated endpoint', async () => {
    const { controller, updateTtl } = makeController();

    const result = await controller.updateTtl(TICKET_TYPE_ID, {
      entitlementTtlMinutes: 12,
    });

    expect(updateTtl.execute).toHaveBeenCalledWith({
      ticketTypeId: TICKET_TYPE_ID,
      entitlementTtlMinutes: 12,
    });
    expect(result.entitlementTtlMinutes).toBe(12);
  });

  it('serializes organizer registration list rows', async () => {
    const { controller, listRegistrations } = makeController();
    const rows: LotteryRegistrationListItem[] = [
      {
        id: REGISTRATION_ID,
        userId: USER_ID,
        userEmail: 'user@example.com',
        userDisplayName: 'User One',
        desiredQuantity: 2,
        status: 'REGISTERED',
        registeredAt: new Date('2026-01-01T01:00:00.000Z'),
        wonAt: null,
        notSelectedAt: null,
        withdrawnAt: null,
        fulfilledAt: null,
        entitlement: null,
      },
    ];
    listRegistrations.execute.mockResolvedValue(rows);

    const result = await controller.registrations(TICKET_TYPE_ID);

    expect(listRegistrations.execute).toHaveBeenCalledWith({ ticketTypeId: TICKET_TYPE_ID });
    expect(result.registrations[0]).toMatchObject({
      registrationId: REGISTRATION_ID,
      userEmail: 'user@example.com',
      desiredQuantity: 2,
      status: 'REGISTERED',
    });
  });
});
