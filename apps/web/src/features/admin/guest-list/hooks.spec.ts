import { describe, expect, it } from 'vitest';
import type { PublicGuestListBatch } from '@ticketbox/api-types';

import { guestListPollingInterval, isGuestListReportable } from './hooks';

function batch(status: PublicGuestListBatch['status']): PublicGuestListBatch {
  return { status } as PublicGuestListBatch;
}

describe('guest-list query state', () => {
  it('polls approximately every two seconds only for visible non-terminal batches', () => {
    expect(guestListPollingInterval([batch('PENDING')])).toBe(2_000);
    expect(guestListPollingInterval([batch('COMPLETED'), batch('PROCESSING')])).toBe(2_000);
    expect(guestListPollingInterval([batch('COMPLETED'), batch('FAILED')])).toBe(false);
    expect(guestListPollingInterval([])).toBe(false);
    expect(guestListPollingInterval(undefined)).toBe(false);
  });

  it('offers reports only for completed terminal statuses', () => {
    expect(isGuestListReportable('COMPLETED')).toBe(true);
    expect(isGuestListReportable('COMPLETED_WITH_ERRORS')).toBe(true);
    expect(isGuestListReportable('FAILED')).toBe(false);
    expect(isGuestListReportable('PENDING')).toBe(false);
    expect(isGuestListReportable('PROCESSING')).toBe(false);
  });
});
