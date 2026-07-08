import type { LotteryEntitlementNotificationContext } from '../../domain/lottery.types';

export type LotteryEntitlementEmailKind = 'grant' | 'expiry-reminder';

export interface LotteryEntitlementEmailContent {
  subject: string;
  body: string;
  actionUrl: string;
}

export class LotteryEntitlementEmailComposer {
  constructor(private readonly ticketAccessBaseUrl: string) {}

  compose(
    context: LotteryEntitlementNotificationContext,
    kind: LotteryEntitlementEmailKind,
  ): LotteryEntitlementEmailContent {
    const actionUrl = this.buildActionUrl(context);
    const expiry = context.entitlement.expiresAt.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });
    const title =
      kind === 'grant'
        ? 'Bạn đã trúng suất mua vé trong đợt bốc thăm TicketBox'
        : 'Suất mua vé trúng thăm sắp hết hạn';
    const intro =
      kind === 'grant'
        ? 'Chúc mừng! Bạn đã trúng suất mua vé trong đợt bốc thăm mở bán sớm.'
        : 'Suất mua vé trúng thăm của bạn sắp hết hạn.';

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
        'Suất mua này không giữ vé cứng. Vé chỉ được giữ khi bạn hoàn tất checkout trước khi hết hạn.',
      ].join('\n'),
    };
  }

  private buildActionUrl(context: LotteryEntitlementNotificationContext): string {
    const base = this.ticketAccessBaseUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({
      lotteryEntitlementId: context.entitlement.id,
    });
    return `${base}/events/${context.concertSlug}?${params.toString()}`;
  }
}
