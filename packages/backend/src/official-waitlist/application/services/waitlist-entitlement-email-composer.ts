import type { WaitlistEntitlementNotificationContext } from '../../domain/waitlist.types';

export type WaitlistEntitlementEmailKind = 'grant' | 'expiry-reminder';

export interface WaitlistEntitlementEmailContent {
  subject: string;
  body: string;
  actionUrl: string;
}

export class WaitlistEntitlementEmailComposer {
  constructor(private readonly ticketAccessBaseUrl: string) {}

  compose(
    context: WaitlistEntitlementNotificationContext,
    kind: WaitlistEntitlementEmailKind,
  ): WaitlistEntitlementEmailContent {
    const actionUrl = this.buildActionUrl(context);
    const expiry = context.entitlement.expiresAt.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });
    const title =
      kind === 'grant'
        ? 'Đến lượt mua vé từ danh sách chờ TicketBox'
        : 'Lượt mua vé từ danh sách chờ sắp hết hạn';
    const intro =
      kind === 'grant'
        ? 'Bạn đã được cấp lượt mua vé từ danh sách chờ chính thức.'
        : 'Lượt mua vé từ danh sách chờ của bạn sắp hết hạn.';

    return {
      subject: title,
      actionUrl,
      body: [
        `Xin chào ${context.userDisplayName},`,
        '',
        intro,
        '',
        `Sự kiện: ${context.concertTitle}`,
        `Hạng vé: ${context.ticketTypeName} (${context.ticketTypeCode})`,
        `Số lượng tối đa: ${context.entitlement.quantity}`,
        `Hạn mua: ${expiry}`,
        '',
        `Mở trang mua vé: ${actionUrl}`,
        '',
        'Lượt mua này không giữ vé cứng. Vé chỉ được giữ khi bạn hoàn tất checkout trước khi hết hạn.',
      ].join('\n'),
    };
  }

  private buildActionUrl(context: WaitlistEntitlementNotificationContext): string {
    const base = this.ticketAccessBaseUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({
      waitlistEntitlementId: context.entitlement.id,
    });
    return `${base}/events/${context.concertSlug}?${params.toString()}`;
  }
}
