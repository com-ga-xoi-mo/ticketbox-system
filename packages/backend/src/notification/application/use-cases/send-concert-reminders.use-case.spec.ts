import { beforeEach, describe, expect, it } from 'vitest';

import type {
  ConcertReminderReadPort,
  ReminderRecipient,
  UpcomingConcertReminderTarget,
} from '../../domain/ports/concert-reminder-read.port';
import type {
  NotificationRepositoryPort,
  UpsertNotificationInput,
} from '../../domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type NotificationRecord,
} from '../../domain/notification.types';
import {
  CONCERT_REMINDER_LEAD_MS,
  CONCERT_REMINDER_SCAN_INTERVAL_MS,
  SendConcertRemindersUseCase,
} from './send-concert-reminders.use-case';

const NOW = new Date('2026-06-23T00:00:00.000Z');

class FakeReadPort implements ConcertReminderReadPort {
  windowStart?: Date;
  windowEnd?: Date;

  constructor(
    private readonly concerts: UpcomingConcertReminderTarget[],
    private readonly holdersByConcert: Record<string, ReminderRecipient[]>,
  ) {}

  async findConcertsStartingWithin(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<UpcomingConcertReminderTarget[]> {
    this.windowStart = windowStart;
    this.windowEnd = windowEnd;
    return this.concerts.filter((c) => c.startsAt >= windowStart && c.startsAt < windowEnd);
  }

  async findValidTicketHolders(concertId: string): Promise<ReminderRecipient[]> {
    return this.holdersByConcert[concertId] ?? [];
  }
}

class InMemoryNotificationRepository implements NotificationRepositoryPort {
  readonly records = new Map<string, NotificationRecord>();

  async upsertByDedupeKey(input: UpsertNotificationInput): Promise<NotificationRecord> {
    const existing = this.records.get(input.dedupeKey);
    if (existing) return existing;

    const record: NotificationRecord = {
      id: `notification-${this.records.size + 1}`,
      userId: input.userId,
      concertId: input.concertId ?? null,
      channel: input.channel,
      type: input.type,
      dedupeKey: input.dedupeKey,
      status: input.status,
      subject: input.subject ?? null,
      body: input.body,
      scheduledAt: input.scheduledAt ?? null,
      sentAt: input.sentAt ?? null,
      failedAttemptCount: 0,
    };
    this.records.set(input.dedupeKey, record);
    return record;
  }

  async findById(): Promise<NotificationRecord | null> {
    return null;
  }

  async recordDeliveryAttempt(): Promise<never> {
    throw new Error('not used');
  }

  async updateStatus(): Promise<never> {
    throw new Error('not used');
  }
}

function concertAt(offsetFromLeadMs: number, id = 'concert-1'): UpcomingConcertReminderTarget {
  return {
    concertId: id,
    concertTitle: `Concert ${id}`,
    startsAt: new Date(NOW.getTime() + CONCERT_REMINDER_LEAD_MS + offsetFromLeadMs),
  };
}

function recipient(userId: string): ReminderRecipient {
  return {
    userId,
    userDisplayName: `User ${userId}`,
    toEmail: `${userId}@ticketbox.test`,
    ticketCount: 2,
  };
}

describe('SendConcertRemindersUseCase', () => {
  let repository: InMemoryNotificationRepository;

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
  });

  it('computes the [now+24h, now+24h+interval) window', async () => {
    const readPort = new FakeReadPort([], {});
    const useCase = new SendConcertRemindersUseCase(readPort, repository);

    await useCase.execute(NOW);

    expect(readPort.windowStart?.getTime()).toBe(NOW.getTime() + CONCERT_REMINDER_LEAD_MS);
    expect(readPort.windowEnd?.getTime()).toBe(
      NOW.getTime() + CONCERT_REMINDER_LEAD_MS + CONCERT_REMINDER_SCAN_INTERVAL_MS,
    );
  });

  it('creates an in-app (SENT) and email (PENDING) reminder per recipient', async () => {
    const readPort = new FakeReadPort([concertAt(0)], {
      'concert-1': [recipient('user-1'), recipient('user-2')],
    });
    const useCase = new SendConcertRemindersUseCase(readPort, repository);

    const result = await useCase.execute(NOW);

    expect(result.scannedConcerts).toBe(1);
    expect(result.recipients).toBe(2);
    expect(repository.records.size).toBe(4); // 2 users x (in-app + email)

    const inApp = repository.records.get('concert-reminder:concert-1:user-1:in-app');
    const email = repository.records.get('concert-reminder:concert-1:user-1:email');
    expect(inApp?.channel).toBe(NotificationChannel.IN_APP);
    expect(inApp?.status).toBe(NotificationStatus.SENT);
    expect(inApp?.type).toBe(NotificationType.CONCERT_REMINDER);
    expect(email?.channel).toBe(NotificationChannel.EMAIL);
    expect(email?.status).toBe(NotificationStatus.PENDING);
  });

  it('returns one email reminder entry per created PENDING email record', async () => {
    const readPort = new FakeReadPort([concertAt(0)], {
      'concert-1': [recipient('user-1'), recipient('user-2')],
    });
    const useCase = new SendConcertRemindersUseCase(readPort, repository);

    const result = await useCase.execute(NOW);

    const pendingEmails = [...repository.records.values()].filter(
      (r) => r.channel === NotificationChannel.EMAIL && r.status === NotificationStatus.PENDING,
    );
    expect(result.emailReminders).toHaveLength(pendingEmails.length);
    expect(result.emailReminders.map((e) => e.notificationId).sort()).toEqual(
      pendingEmails.map((r) => r.id).sort(),
    );
    expect(result.emailReminders).toContainEqual({
      notificationId: email(repository, 'user-1').id,
      toEmail: 'user-1@ticketbox.test',
    });
  });

  it('only processes concerts inside the window', async () => {
    const readPort = new FakeReadPort(
      [
        concertAt(-1000, 'too-early'), // before windowStart
        concertAt(1000, 'in-window'),
        concertAt(CONCERT_REMINDER_SCAN_INTERVAL_MS + 1000, 'too-late'),
      ],
      {
        'in-window': [recipient('user-1')],
        'too-early': [recipient('user-9')],
        'too-late': [recipient('user-9')],
      },
    );
    const useCase = new SendConcertRemindersUseCase(readPort, repository);

    const result = await useCase.execute(NOW);

    expect(result.scannedConcerts).toBe(1);
    expect(result.recipients).toBe(1);
    expect(repository.records.has('concert-reminder:in-window:user-1:email')).toBe(true);
  });

  it('is idempotent across repeated scans (no duplicate records)', async () => {
    const readPort = new FakeReadPort([concertAt(0)], {
      'concert-1': [recipient('user-1')],
    });
    const useCase = new SendConcertRemindersUseCase(readPort, repository);

    const first = await useCase.execute(NOW);
    const second = await useCase.execute(NOW);

    expect(repository.records.size).toBe(2); // still just in-app + email
    expect(second.emailReminders[0]?.notificationId).toBe(first.emailReminders[0]?.notificationId);
  });
});

function email(repo: InMemoryNotificationRepository, userId: string): NotificationRecord {
  const record = repo.records.get(`concert-reminder:concert-1:${userId}:email`);
  if (!record) throw new Error(`missing email record for ${userId}`);
  return record;
}
