import { describe, expect, it } from 'vitest';

import { parseOrderError } from './orders';

describe('parseOrderError entitlement messages (waitlist + lottery)', () => {
  it('maps missing entitlement to a Vietnamese purchase-turn message', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement is required for ticket type: tt1')),
    ).toBe('Bạn cần chờ đến lượt mua vé của mình (danh sách chờ hoặc bốc thăm mở bán sớm).');
  });

  it('maps expired entitlement to a Vietnamese expiry message', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement is expired: entitlement-1')),
    ).toBe('Lượt mua vé của bạn đã hết hạn. Vui lòng kiểm tra lại trạng thái mua vé.');
  });

  it('maps quantity exceeded entitlement errors', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement quantity exceeded')),
    ).toBe('Số lượng vé vượt quá lượt mua được cấp cho bạn.');
  });

  it('maps invalid entitlement errors without leaking internals', () => {
    expect(
      parseOrderError(new Error('Waitlist entitlement is invalid: e1')),
    ).toBe('Lượt mua vé không hợp lệ hoặc không thuộc tài khoản này.');
  });
});
