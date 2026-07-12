import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { PrismaService } from '@ticketbox/backend/platform/database/prisma.service';
import {
  REALTIME_NOTIFICATION_PUBLISHER,
  type RealtimeNotificationPublisherPort,
} from '@ticketbox/backend/notification/domain/ports/realtime-notification-publisher.port';

// Ép Node.js nạp file .env ngay lập tức
dotenv.config();

@Processor('notifications')
export class GiftEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(GiftEmailProcessor.name);
  private transporter;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REALTIME_NOTIFICATION_PUBLISHER)
    private readonly realtimePublisher: RealtimeNotificationPublisherPort,
  ) {
    super();
    // Đọc cấu hình SMTP thật từ biến môi trường của user
    this.logger.log(`Initializing Mailer with EMAIL_SMTP_HOST: ${process.env.EMAIL_SMTP_HOST}`);

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
      secure:
        process.env.EMAIL_SMTP_SECURE === 'true' ||
        parseInt(process.env.EMAIL_SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
      },
    });
  }

  async process(job: Job<any>): Promise<void> {
    if (job.name === 'gift-invitation') {
      const event = job.data;
      this.logger.log(
        `[MAILER] Sending gift invitation to ${event.recipientEmail} via ${process.env.EMAIL_SMTP_HOST}`,
      );

      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || '"TicketBox" <no-reply@ticketbox.vn>',
          to: event.recipientEmail,
          subject: `[TicketBox] ${event.senderName} vừa gửi tặng bạn 1 vé xem ${event.concertName}!`,
          text: `Chào bạn,
        
${event.senderName} vừa gửi tặng bạn 1 vé (${event.ticketType}) để tham dự sự kiện ${event.concertName}.

Vui lòng nhấn vào đường link dưới đây để nhận vé:
http://localhost:5173/transfers/${event.token}

Lưu ý: Lời mời này sẽ hết hạn vào lúc ${new Date(event.expiresAt).toLocaleString('vi-VN')}.

Trân trọng,
TicketBox Team`,
        });
        this.logger.log(`[MAILER] Email sent successfully to ${event.recipientEmail}`);
      } catch (error) {
        this.logger.error(`[MAILER] Failed to send email to ${event.recipientEmail}`, error);
      }
    } else if (job.name === 'gift-outcome') {
      const event = job.data;
      const isAccepted = event.outcome === 'ACCEPTED';
      const actionText = isAccepted ? 'chấp nhận' : 'từ chối';

      this.logger.log(
        `[NOTIFY] Creating in-app notification for sender ${event.senderId} (Outcome: ${event.outcome})`,
      );

      try {
        await this.prisma.notification.create({
          data: {
            userId: event.senderId,
            channel: 'IN_APP',
            type: 'TICKET_UPDATE',
            dedupeKey: `gift-outcome-${event.transferId}-${Date.now()}`,
            status: 'SENT',
            subject: `Lời mời tặng vé bị ${actionText}`,
            body: `${event.recipientName} đã ${actionText} lời mời tặng vé xem sự kiện ${event.concertName} của bạn.`,
            actionUrl: '/account/tickets',
            scheduledAt: new Date(),
            sentAt: new Date(),
          },
        });

        // Best-effort realtime signal so a connected browser updates without a reload.
        await this.realtimePublisher.publishNewNotification(event.senderId).catch((err) => {
          this.logger.warn(`Failed to push realtime notification to sender: ${err.message}`);
        });

        // Gửi thêm email báo cáo kết quả cho Sender
        const sender = await this.prisma.user.findUnique({ where: { id: event.senderId } });
        if (sender && sender.email) {
          await this.transporter.sendMail({
            from: process.env.EMAIL_FROM || '"TicketBox" <no-reply@ticketbox.vn>',
            to: sender.email,
            subject: `[TicketBox] ${event.recipientName} đã ${actionText} nhận vé ${event.concertName}`,
            text: `Chào ${sender.displayName || 'bạn'},\n\nNgười nhận ${event.recipientName} đã ${actionText} lời mời tặng vé của bạn.\n\nVào TicketBox để xem chi tiết nhé!`,
          });
        }
      } catch (error) {
        this.logger.error(`[NOTIFY] Failed to create outcome notification`, error);
      }
    }
  }
}
