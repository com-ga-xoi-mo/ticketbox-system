import type { WaitlistRecoveryNotificationContext } from '../../domain/waitlist.types';

export interface WaitlistRecoveryEmailContent {
  subject: string;
  body: string;
  actionUrl: string;
}

export class WaitlistEntitlementEmailComposer {
  constructor(private readonly ticketAccessBaseUrl: string) {}

  composeRecovery(
    context: WaitlistRecoveryNotificationContext,
  ): WaitlistRecoveryEmailContent {
    const actionUrl = this.buildActionUrl(context);

    return {
      subject: 'Vé bạn chờ đã quay lại TicketBox',
      actionUrl,
      body: [
        `Xin chào ${context.userDisplayName},`,
        '',
        'Vé bạn đăng ký theo dõi vừa quay lại public sale. Vé không được giữ riêng, bạn hãy vào mua ngay nếu vẫn còn nhu cầu.',
        '',
        `Sự kiện: ${context.concertTitle}`,
        `Hạng vé: ${context.ticketTypeName} (${context.ticketTypeCode})`,
        '',
        `Mở trang mua vé: ${actionUrl}`,
        '',
        'Lưu ý: thông báo này không giữ chỗ và không tạo quyền mua ưu tiên. Vé chỉ được giữ khi bạn hoàn tất checkout thành công.',
      ].join('\n'),
    };
  }

  private buildActionUrl(context: WaitlistRecoveryNotificationContext): string {
    const base = this.ticketAccessBaseUrl.replace(/\/+$/, '');
    return `${base}/events/${context.concertSlug}`;
  }
}
