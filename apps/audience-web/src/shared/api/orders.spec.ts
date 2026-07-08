import { describe, expect, it } from 'vitest';

import { parseOrderError } from './orders';

describe('parseOrderError waitlist messages', () => {
  it('maps missing entitlement to a Vietnamese purchase-turn message', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement is required for ticket type: tt1')),
    ).toBe('Bạn cần chờ đến lượt mua vé từ danh sách chờ chính thức.');
  });

  it('maps expired entitlement to a Vietnamese expiry message', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement is expired: entitlement-1')),
    ).toBe('Lượt mua vé của bạn đã hết hạn. Vui lòng kiểm tra lại danh sách chờ.');
  });

  it('maps quantity exceeded entitlement errors', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement quantity exceeded')),
    ).toBe('Số lượng vé vượt quá lượt mua được cấp từ danh sách chờ.');
  });
});
