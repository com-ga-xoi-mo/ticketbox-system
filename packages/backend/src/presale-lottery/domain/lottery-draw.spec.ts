import { describe, expect, it } from 'vitest';

import { orderRegistrantsBySeed, selectWinners } from './lottery-draw';
import type { LotteryRegistrationRecord } from './lottery.types';

function reg(id: string, userId: string, desiredQuantity = 1): LotteryRegistrationRecord {
  return {
    id,
    userId,
    concertId: 'concert-1',
    ticketTypeId: 'tt-1',
    desiredQuantity,
    wonQuantity: 0,
    purchasedQuantity: 0,
    status: 'REGISTERED',
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    wonAt: null,
    notSelectedAt: null,
    withdrawnAt: null,
    fulfilledAt: null,
  };
}

describe('orderRegistrantsBySeed', () => {
  it('is deterministic for the same seed and set', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const first = orderRegistrantsBySeed('seed-123', ids);
    const second = orderRegistrantsBySeed('seed-123', [...ids].reverse());
    expect(first).toEqual(second);
  });

  it('produces a different order for a different seed (generally)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const a = orderRegistrantsBySeed('seed-A', ids).join(',');
    const b = orderRegistrantsBySeed('seed-B', ids).join(',');
    expect(a).not.toEqual(b);
  });
});

describe('selectWinners', () => {
  it('grants winners up to the grantable unit budget and marks the rest not-selected', () => {
    const registrations = [reg('r1', 'u1'), reg('r2', 'u2'), reg('r3', 'u3')];
    const result = selectWinners({
      seed: 'seed-1',
      registrations,
      grantableUnits: 2,
      maxPerUser: 4,
      remainingAllowanceByUser: new Map([
        ['u1', 4],
        ['u2', 4],
        ['u3', 4],
      ]),
    });

    expect(result.winners).toHaveLength(2);
    expect(result.notSelectedRegistrationIds).toHaveLength(1);
    expect(result.allocationConsumed).toBe(2);
  });

  it('caps winner quantity by remaining per-user allowance', () => {
    const registrations = [reg('r1', 'u1', 5)];
    const result = selectWinners({
      seed: 'seed-1',
      registrations,
      grantableUnits: 10,
      maxPerUser: 4,
      remainingAllowanceByUser: new Map([['u1', 2]]),
    });

    expect(result.winners[0].quantity).toBe(2);
    expect(result.allocationConsumed).toBe(2);
  });

  it('is deterministic: same seed yields the same winners', () => {
    const registrations = [reg('r1', 'u1'), reg('r2', 'u2'), reg('r3', 'u3'), reg('r4', 'u4')];
    const run = () =>
      selectWinners({
        seed: 'fixed-seed',
        registrations,
        grantableUnits: 2,
        maxPerUser: 4,
        remainingAllowanceByUser: new Map(registrations.map((r) => [r.userId, 4])),
      }).winners.map((w) => w.registrationId);

    expect(run()).toEqual(run());
  });

  it('grants nothing when there is no grantable budget', () => {
    const registrations = [reg('r1', 'u1')];
    const result = selectWinners({
      seed: 'seed-1',
      registrations,
      grantableUnits: 0,
      maxPerUser: 4,
      remainingAllowanceByUser: new Map([['u1', 4]]),
    });

    expect(result.winners).toHaveLength(0);
    expect(result.notSelectedRegistrationIds).toEqual(['r1']);
  });
});
