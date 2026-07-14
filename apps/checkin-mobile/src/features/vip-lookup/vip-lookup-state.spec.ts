import { describe, expect, it, vi } from 'vitest';

import type { VipLookupApiClient, VipLookupResult } from '../../api/checkin-mobile-api.types';
import { activeAssignment, staffSession } from '../../test/fixtures';
import { canSubmitVipLookup, VipLookupController } from './vip-lookup-state';

function apiWith(
  result: VipLookupResult,
): VipLookupApiClient & { lookupVipGuest: ReturnType<typeof vi.fn> } {
  return { lookupVipGuest: vi.fn().mockResolvedValue(result) };
}

describe('VipLookupController', () => {
  it('derives assignment, concert, and gate from the current selected assignment', async () => {
    const api = apiWith({
      status: 'found',
      guest: {
        id: '77777777-7777-4777-8777-777777777777',
        guestName: 'VIP Guest',
        email: 'vip@ticketbox.test',
      },
    });
    const controller = new VipLookupController(api);
    await expect(
      controller.lookup(
        { lookupType: 'email', value: ' vip@ticketbox.test ' },
        { session: staffSession, assignment: activeAssignment, online: true },
      ),
    ).resolves.toMatchObject({ status: 'found', guest: { guestName: 'VIP Guest' } });
    expect(api.lookupVipGuest).toHaveBeenCalledWith(staffSession.accessToken, {
      assignmentId: activeAssignment.assignmentId,
      concertId: activeAssignment.concertId,
      gate: activeAssignment.gate,
      lookupType: 'email',
      value: 'vip@ticketbox.test',
    });
  });

  it('disables offline lookup without calling, queueing, or caching through another boundary', async () => {
    const api = apiWith({ status: 'not_found' });
    const controller = new VipLookupController(api);
    await expect(
      controller.lookup(
        { lookupType: 'phone', value: '0901234567' },
        { session: staffSession, assignment: activeAssignment, online: false },
      ),
    ).resolves.toMatchObject({ status: 'offline' });
    expect(api.lookupVipGuest).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'not_found' } as VipLookupResult, 'not-found'],
    [
      { status: 'unauthorized', httpStatus: 403, message: 'Wrong assignment' } as VipLookupResult,
      'authorization-error',
    ],
    [
      { status: 'request-error', httpStatus: 400, message: 'Bad value' } as VipLookupResult,
      'validation-error',
    ],
    [
      { status: 'service-error', httpStatus: 503, message: 'Unavailable' } as VipLookupResult,
      'service-error',
    ],
    [{ status: 'transport-error', message: 'offline' } as VipLookupResult, 'network-error'],
    [
      { status: 'invalid-response', message: 'Invalid response' } as VipLookupResult,
      'invalid-response',
    ],
  ])('maps API result $0 to screen state $1', async (result, status) => {
    const controller = new VipLookupController(apiWith(result));
    await expect(
      controller.lookup(
        { lookupType: 'external_ref', value: 'REF-1' },
        { session: staffSession, assignment: activeAssignment, online: true },
      ),
    ).resolves.toMatchObject({ status });
  });

  it('validates user input before API submission', async () => {
    const api = apiWith({ status: 'not_found' });
    const controller = new VipLookupController(api);
    await expect(
      controller.lookup(
        { lookupType: 'email', value: '   ' },
        { session: staffSession, assignment: activeAssignment, online: true },
      ),
    ).resolves.toMatchObject({ status: 'validation-error' });
    expect(api.lookupVipGuest).not.toHaveBeenCalled();
  });
});

describe('VIP submit controls', () => {
  it('requires online, non-empty input and a non-submitting state', () => {
    expect(canSubmitVipLookup(true, { status: 'idle' }, 'vip@x.test')).toBe(true);
    expect(canSubmitVipLookup(false, { status: 'idle' }, 'vip@x.test')).toBe(false);
    expect(canSubmitVipLookup(true, { status: 'idle' }, '   ')).toBe(false);
    expect(canSubmitVipLookup(true, { status: 'submitting' }, 'vip@x.test')).toBe(false);
  });
});
