import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
  MissingCheckinStaffRoleError,
} from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import { VipLookupRequestPipe } from './dto/vip-lookup.dto';
import { VipGuestLookupController } from './vip-guest-lookup.controller';

const assignmentId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const actor = { id: 'staff', email: 'staff@ticketbox.test', roles: [Role.CHECKIN_STAFF] };
const request = {
  assignmentId,
  concertId,
  gate: 'Main Gate',
  lookupType: 'email' as const,
  value: 'vip@ticketbox.test',
};

describe('VipGuestLookupController', () => {
  it('uses the strict shared schema for trimming and unknown-field rejection', () => {
    const pipe = new VipLookupRequestPipe();
    expect(
      pipe.transform({ ...request, gate: ' Main Gate ', value: ' VIP@TicketBox.test ' }),
    ).toEqual({ ...request, value: 'VIP@TicketBox.test' });
    expect(() => pipe.transform({ ...request, unexpected: true })).toThrow(BadRequestException);
    expect(() => pipe.transform({ ...request, assignmentId: 'not-a-uuid' })).toThrow(
      BadRequestException,
    );
  });

  it.each([
    new MissingCheckinStaffRoleError(),
    new MissingActiveCheckinAssignmentError(concertId),
    new CheckinGateMismatchError('Other Gate'),
  ])('maps known authorization errors to forbidden', async (error) => {
    const lookup = { execute: vi.fn().mockRejectedValue(error) };
    const controller = new VipGuestLookupController(lookup as never);
    await expect(controller.execute(request, { user: actor })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not disguise an unexpected repository failure as an assignment error', async () => {
    const unexpected = new Error('database unavailable');
    const lookup = { execute: vi.fn().mockRejectedValue(unexpected) };
    const controller = new VipGuestLookupController(lookup as never);
    await expect(controller.execute(request, { user: actor })).rejects.toBe(unexpected);
  });
});
