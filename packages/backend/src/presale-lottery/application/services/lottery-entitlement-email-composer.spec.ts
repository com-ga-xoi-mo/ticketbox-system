import { describe, expect, it } from 'vitest';

import { LotteryEntitlementEmailComposer } from './lottery-entitlement-email-composer';
import type { LotteryEntitlementNotificationContext } from '../../domain/lottery.types';

const context: LotteryEntitlementNotificationContext = {
  entitlement: {
    id: '11111111-1111-1111-1111-111111111111',
    lotteryRegistrationId: 'reg-1',
    userId: 'u1',
    concertId: 'c1',
    ticketTypeId: 'tt1',
    orderId: null,
    status: 'ACTIVE',
    quantity: 2,
    grantedAt: new Date('2026-02-01T10:00:00Z'),
    expiresAt: new Date('2026-02-01T10:15:00Z'),
    consumedAt: null,
    revokedAt: null,
  },
  userEmail: 'winner@example.com',
  userDisplayName: 'Nguyễn Văn A',
  concertTitle: 'Đêm nhạc Trịnh',
  concertSlug: 'dem-nhac-trinh',
  ticketTypeName: 'Hạng Thường',
  ticketTypeCode: 'STD',
};

describe('LotteryEntitlementEmailComposer', () => {
  const composer = new LotteryEntitlementEmailComposer('https://tickets.example.com/');

  it('composes a Vietnamese grant email with diacritics and event-slug action url', () => {
    const content = composer.compose(context, 'grant');
    expect(content.subject).toContain('trúng suất mua vé');
    expect(content.body).toContain('Nguyễn Văn A');
    expect(content.body).toContain('Đêm nhạc Trịnh');
    expect(content.actionUrl).toContain('/events/dem-nhac-trinh');
    expect(content.actionUrl).toContain(
      'lotteryEntitlementId=11111111-1111-1111-1111-111111111111',
    );
  });

  it('composes a Vietnamese expiry-reminder email', () => {
    const content = composer.compose(context, 'expiry-reminder');
    expect(content.subject).toContain('sắp hết hạn');
    expect(content.body).toContain('sắp hết hạn');
  });
});
