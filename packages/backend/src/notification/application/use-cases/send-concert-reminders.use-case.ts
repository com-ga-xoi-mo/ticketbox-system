import type {
  ConcertReminderReadPort,
  ReminderRecipient,
  UpcomingConcertReminderTarget,
} from '../../domain/ports/concert-reminder-read.port';
import type { NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../domain/notification.types';

/** How often the scheduled scan runs; also the width of the reminder window. */
export const CONCERT_REMINDER_SCAN_INTERVAL_MS = 300_000; // 5 minutes
/** Lead time before concert start at which holders are reminded. */
export const CONCERT_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // 24 hours
/** Timezone used only to format the human-readable start time shown to users. */
const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface CreatedEmailReminder {
  notificationId: string;
  toEmail: string;
}

export interface SendConcertRemindersResult {
  scannedConcerts: number;
  recipients: number;
  emailReminders: CreatedEmailReminder[];
}

export class SendConcertRemindersUseCase {
  constructor(
    private readonly readPort: ConcertReminderReadPort,
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly scanIntervalMs: number = CONCERT_REMINDER_SCAN_INTERVAL_MS,
  ) {}

  async execute(now: Date = new Date()): Promise<SendConcertRemindersResult> {
    const windowStart = new Date(now.getTime() + CONCERT_REMINDER_LEAD_MS);
    const windowEnd = new Date(windowStart.getTime() + this.scanIntervalMs);

    const concerts = await this.readPort.findConcertsStartingWithin(windowStart, windowEnd);

    let recipientCount = 0;
    const emailReminders: CreatedEmailReminder[] = [];

    for (const concert of concerts) {
      const recipients = await this.readPort.findValidTicketHolders(concert.concertId);

      for (const recipient of recipients) {
        recipientCount += 1;
        const email = await this.createReminders(concert, recipient);
        emailReminders.push({ notificationId: email.id, toEmail: recipient.toEmail });
      }
    }

    return {
      scannedConcerts: concerts.length,
      recipients: recipientCount,
      emailReminders,
    };
  }

  private async createReminders(
    concert: UpcomingConcertReminderTarget,
    recipient: ReminderRecipient,
  ): Promise<{ id: string }> {
    const subject = `Reminder: ${concert.concertTitle} starts in 24 hours`;
    const body = this.buildBody(concert, recipient);

    await this.notificationRepository.upsertByDedupeKey({
      userId: recipient.userId,
      concertId: concert.concertId,
      channel: NotificationChannel.IN_APP,
      type: NotificationType.CONCERT_REMINDER,
      dedupeKey: this.dedupeKey(concert.concertId, recipient.userId, NotificationChannel.IN_APP),
      status: NotificationStatus.SENT,
      subject,
      body,
      sentAt: new Date(),
    });

    return this.notificationRepository.upsertByDedupeKey({
      userId: recipient.userId,
      concertId: concert.concertId,
      channel: NotificationChannel.EMAIL,
      type: NotificationType.CONCERT_REMINDER,
      dedupeKey: this.dedupeKey(concert.concertId, recipient.userId, NotificationChannel.EMAIL),
      status: NotificationStatus.PENDING,
      subject,
      body,
    });
  }

  private dedupeKey(concertId: string, userId: string, channel: NotificationChannel): string {
    const suffix = channel === NotificationChannel.IN_APP ? 'in-app' : 'email';
    return `concert-reminder:${concertId}:${userId}:${suffix}`;
  }

  private buildBody(concert: UpcomingConcertReminderTarget, recipient: ReminderRecipient): string {
    const lines = [
      `Hi ${recipient.userDisplayName},`,
      `This is a reminder that ${concert.concertTitle} starts in about 24 hours.`,
      `Starts at: ${this.formatStartsAt(concert.startsAt)}`,
      `Your tickets: ${recipient.ticketCount}`,
      `See you there!`,
    ];

    return lines.join('\n');
  }

  private formatStartsAt(startsAt: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: DISPLAY_TIME_ZONE,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(startsAt);
  }
}
