import { describe, expect, it } from 'vitest';

import { LotteryWinnerEmailComposer } from './lottery-entitlement-email-composer';
import type { LotteryWinnerNotificationContext } from '../../domain/lottery.types';

const context: LotteryWinnerNotificationContext = {
  registrationId: 'reg-1',
  userId: 'u1',
  userEmail: 'winner@example.com',
  userDisplayName: 'Nguyễn Văn A',
  concertId: 'c1',
  concertTitle: 'Đêm nhạc Trịnh',
  concertSlug: 'dem-nhac-trinh',
  ticketTypeName: 'Hạng Thường',
  ticketTypeCode: 'STD',
  wonQuantity: 2,
};

describe('LotteryWinnerEmailComposer', () => {
  const composer = new LotteryWinnerEmailComposer('https://tickets.example.com/');

  it('composes a Vietnamese winner email with diacritics and event-slug action url', () => {
    const content = composer.compose(context);
    expect(content.subject).toContain('trúng bốc thăm');
    expect(content.body).toContain('Nguyễn Văn A');
    expect(content.body).toContain('Đêm nhạc Trịnh');
    expect(content.body).toContain('Số lượng được mua: 2');
    expect(content.actionUrl).toBe('https://tickets.example.com/events/dem-nhac-trinh');
    // No entitlement ID or countdown in the URL
    expect(content.actionUrl).not.toContain('lotteryEntitlementId');
  });

  it('uses notify-only wording without slot or personal expiry', () => {
    const content = composer.compose(context);
    expect(content.body).toContain('đợt presale');
    expect(content.body).toContain('không tạo slot giữ chỗ');
    // Reassures the winner there is no personal expiry countdown.
    expect(content.body).toContain('không có đồng hồ hết hạn cá nhân');
  });
});
