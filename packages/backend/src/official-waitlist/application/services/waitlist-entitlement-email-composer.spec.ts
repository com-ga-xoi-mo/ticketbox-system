import { describe, expect, it } from 'vitest';

import type {
  PurchaseEntitlementRecord,
  WaitlistEntitlementNotificationContext,
} from '../../domain/waitlist.types';
import { WaitlistEntitlementEmailComposer } from './waitlist-entitlement-email-composer';

function entitlement(
  overrides: Partial<PurchaseEntitlementRecord> = {},
): PurchaseEntitlementRecord {
  return {
    id: 'entitlement-1',
    waitlistEntryId: 'entry-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    orderId: null,
    source: 'WAITLIST',
    status: 'ACTIVE',
    quantity: 1,
    grantedAt: new Date('2026-07-08T10:00:00.000Z'),
    expiresAt: new Date('2026-07-08T10:15:00.000Z'),
    consumedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function context(): WaitlistEntitlementNotificationContext {
  return {
    entitlement: entitlement(),
    userEmail: 'audience@ticketbox.test',
    userDisplayName: 'Nguyễn Linh',
    concertTitle: 'Anh Trai Say Hi Live Concert',
    concertSlug: 'anh-trai-say-hi-2026',
    ticketTypeName: 'SVIP',
    ticketTypeCode: 'SVIP',
  };
}

describe('WaitlistEntitlementEmailComposer', () => {
  it('renders the grant email with Vietnamese diacritics', () => {
    const composer = new WaitlistEntitlementEmailComposer('http://localhost:5173');

    const content = composer.compose(context(), 'grant');

    expect(content.subject).toBe(
      'Đến lượt mua vé từ danh sách chờ TicketBox',
    );
    expect(content.body).toContain('Xin chào Nguyễn Linh,');
    expect(content.body).toContain(
      'Bạn đã được cấp lượt mua vé từ danh sách chờ chính thức.',
    );
    expect(content.body).toContain('Sự kiện: Anh Trai Say Hi Live Concert');
    expect(content.body).toContain('Hạng vé: SVIP (SVIP)');
    expect(content.body).toContain('Số lượng tối đa: 1');
    expect(content.body).toContain('Hạn mua:');
    expect(content.body).toContain('Mở trang mua vé:');
    expect(content.body).toContain(
      'Lượt mua này không giữ vé cứng. Vé chỉ được giữ khi bạn hoàn tất checkout trước khi hết hạn.',
    );
  });

  it('renders the near-expiry email with Vietnamese diacritics', () => {
    const composer = new WaitlistEntitlementEmailComposer('http://localhost:5173');

    const content = composer.compose(context(), 'expiry-reminder');

    expect(content.subject).toBe(
      'Lượt mua vé từ danh sách chờ sắp hết hạn',
    );
    expect(content.body).toContain(
      'Lượt mua vé từ danh sách chờ của bạn sắp hết hạn.',
    );
    expect(content.body).toContain('Hạn mua:');
  });

  it('keeps the action URL on the audience event slug', () => {
    const composer = new WaitlistEntitlementEmailComposer(
      'http://localhost:5173/',
    );

    const content = composer.compose(context(), 'grant');

    expect(content.actionUrl).toBe(
      'http://localhost:5173/events/anh-trai-say-hi-2026?waitlistEntitlementId=entitlement-1',
    );
  });
});
