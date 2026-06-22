import { describe, expect, it } from 'vitest';

import { calculateAvailableQuantity } from './catalog-availability';

describe('calculateAvailableQuantity', () => {
  it('subtracts reserved and sold quantities from total capacity', () => {
    expect(calculateAvailableQuantity(200, 25, 50)).toBe(125);
  });

  it('clamps oversubscribed defensive values to zero', () => {
    expect(calculateAvailableQuantity(10, 8, 7)).toBe(0);
  });
});
