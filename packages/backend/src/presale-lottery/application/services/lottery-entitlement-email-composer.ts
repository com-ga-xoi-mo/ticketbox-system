import type { LotteryWinnerNotificationContext } from '../../domain/lottery.types';

export interface LotteryWinnerEmailContent {
  subject: string;
  body: string;
  actionUrl: string;
}

export class LotteryWinnerEmailComposer {
  constructor(private readonly ticketAccessBaseUrl: string) {}

  compose(context: LotteryWinnerNotificationContext): LotteryWinnerEmailContent {
    const actionUrl = this.buildActionUrl(context);

    return {
      subject: 'Bạn đã trúng bốc thăm mua vé TicketBox',
      actionUrl,
      body: [
        `Xin chào ${context.userDisplayName},`,
        '',
        'Chúc mừng! Bạn đã trúng trong đợt bốc thăm mở bán sớm.',
        '',
        `Sự kiện: ${context.concertTitle}`,
        `Hạng vé: ${context.ticketTypeName} (${context.ticketTypeCode})`,
        `Số lượng được mua: ${context.wonQuantity}`,
        '',
        `Mở trang mua vé: ${actionUrl}`,
        '',
        'Bạn được mua vé trong suốt đợt presale, cho tới khi mở bán công khai. Thông báo này không tạo slot giữ chỗ riêng và không có đồng hồ hết hạn cá nhân.',
      ].join('\n'),
    };
  }

  private buildActionUrl(context: LotteryWinnerNotificationContext): string {
    const base = this.ticketAccessBaseUrl.replace(/\/+$/, '');
    return `${base}/events/${context.concertSlug}`;
  }
}
