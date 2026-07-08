import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import {
  LotteryNotConfiguredError,
  LotteryRegistrationWindowClosedError,
} from '../../domain/errors';
import type { LotteryStatusRecord } from '../../domain/lottery.types';
import { PresaleLotteryController } from './presale-lottery.controller';

const TICKET_TYPE_ID = '11111111-1111-1111-1111-111111111111';
const req = { user: { id: 'user-1' } } as any;

function makeController(overrides: {
  register?: { execute: ReturnType<typeof vi.fn> };
  withdraw?: { execute: ReturnType<typeof vi.fn> };
  status?: { execute: ReturnType<typeof vi.fn> };
} = {}) {
  const register = overrides.register ?? { execute: vi.fn() };
  const withdraw = overrides.withdraw ?? { execute: vi.fn() };
  const status = overrides.status ?? { execute: vi.fn() };
  return {
    controller: new PresaleLotteryController(
      register as any,
      withdraw as any,
      status as any,
    ),
    register,
    withdraw,
    status,
  };
}

const emptyStatus: LotteryStatusRecord = {
  registration: null,
  config: null,
  entitlement: null,
};

describe('PresaleLotteryController', () => {
  it('registers with a valid body and returns the serialized status', async () => {
    const { controller, register } = makeController();
    register.execute.mockResolvedValue(emptyStatus);

    const result = await controller.register(
      { ticketTypeId: TICKET_TYPE_ID, desiredQuantity: 2 },
      req,
    );

    expect(register.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      ticketTypeId: TICKET_TYPE_ID,
      desiredQuantity: 2,
    });
    expect(result.ticketTypeId).toBe(TICKET_TYPE_ID);
  });

  it('rejects an invalid register body before hitting the use case', async () => {
    const { controller, register } = makeController();
    await expect(
      controller.register({ ticketTypeId: 'not-a-uuid', desiredQuantity: 0 }, req),
    ).rejects.toBeTruthy();
    expect(register.execute).not.toHaveBeenCalled();
  });

  it('maps window-closed errors to 400', async () => {
    const register = {
      execute: vi.fn().mockRejectedValue(new LotteryRegistrationWindowClosedError(TICKET_TYPE_ID)),
    };
    const { controller } = makeController({ register });
    await expect(
      controller.register({ ticketTypeId: TICKET_TYPE_ID, desiredQuantity: 1 }, req),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps not-configured errors to 404 on withdraw', async () => {
    const withdraw = {
      execute: vi.fn().mockRejectedValue(new LotteryNotConfiguredError(TICKET_TYPE_ID)),
    };
    const { controller } = makeController({ withdraw });
    await expect(controller.withdraw(TICKET_TYPE_ID, req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
