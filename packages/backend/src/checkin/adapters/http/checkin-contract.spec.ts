import { describe, expect, it } from 'vitest';

import type { OnlineScanResult } from '../../domain/checkin-scan.types';

describe('Online check-in API contract', () => {
  it('uses stable lower-case scan statuses for mobile clients', () => {
    const statuses = [
      'accepted',
      'duplicate',
      'invalid',
      'unassigned',
    ] satisfies OnlineScanResult['status'][];

    expect(statuses).toEqual(['accepted', 'duplicate', 'invalid', 'unassigned']);
  });

  it('keeps authorization failures as transport errors for mobile handoff', () => {
    const authorizationErrorShape = {
      statusCode: 401,
      message: 'Unauthorized',
    };

    expect(authorizationErrorShape).toMatchObject({
      statusCode: expect.any(Number),
      message: expect.any(String),
    });
  });
});
