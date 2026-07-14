import { describe, expect, it } from 'vitest';

import type { WaitlistRecoveryNotificationContext } from '../../domain/waitlist.types';
import { WaitlistEntitlementEmailComposer } from './waitlist-entitlement-email-composer';

function context(): WaitlistRecoveryNotificationContext {
  return {
    entry: {
      id: 'entry-1',
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
      desiredQuantity: 1,
      status: 'WAITING',
      joinedAt: new Date('2026-07-08T10:00:00.000Z'),
      cancelledAt: null,
    },
    userEmail: 'audience@ticketbox.test',
    userDisplayName: 'Nguyễn Linh',
    concertTitle: 'Anh Trai Say Hi Live Concert',
    concertSlug: 'anh-trai-say-hi-2026',
    ticketTypeName: 'SVIP',
    ticketTypeCode: 'SVIP',
  };
}

describe('WaitlistEntitlementEmailComposer', () => {
  it('renders the recovery email with Vietnamese diacritics and notify-only wording', () => {
    const composer = new WaitlistEntitlementEmailComposer('http://localhost:5173');

    const content = composer.composeRecovery(context());

    expect(content.subject).toBe('Vé bạn chờ đã quay lại TicketBox');
    expect(content.body).toContain('Xin chào Nguyễn Linh,');
    expect(content.body).toContain('Vé bạn đăng ký theo dõi vừa quay lại public sale.');
    expect(content.body).toContain('không giữ chỗ');
    expect(content.body).toContain('không tạo quyền mua ưu tiên');
    expect(content.actionUrl).toBe(
      'http://localhost:5173/events/anh-trai-say-hi-2026',
    );
  });
});
