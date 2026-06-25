import { describe, expect, it, vi } from 'vitest';
import type { Job, Queue } from 'bullmq';

import type { SendConcertRemindersUseCase } from '../../../application/use-cases/send-concert-reminders.use-case';
import type { PlatformConfigService } from '../../../../platform/config/platform-config.service';
import { ConcertReminderProcessor } from './concert-reminder.processor';
import type { NotificationDeliveryJobData } from '../../../infrastructure/queue/notification-job.types';

function buildProcessor(
  useCaseResult: Awaited<ReturnType<SendConcertRemindersUseCase['execute']>>,
): { processor: ConcertReminderProcessor; deliveryQueue: Queue<NotificationDeliveryJobData> } {
  const sendConcertReminders = {
    execute: vi.fn(async () => useCaseResult),
  } as unknown as SendConcertRemindersUseCase;
  const config = {
    emailMaxAttempts: 3,
    emailRetryBackoffMs: 5000,
  } as PlatformConfigService;
  const scanQueue = { add: vi.fn(async () => undefined) } as unknown as Queue;
  const deliveryQueue = {
    add: vi.fn(async () => undefined),
  } as unknown as Queue<NotificationDeliveryJobData>;

  const processor = new ConcertReminderProcessor(
    sendConcertReminders,
    config,
    scanQueue,
    deliveryQueue,
  );

  return { processor, deliveryQueue };
}

describe('ConcertReminderProcessor', () => {
  it('enqueues one delivery job per returned email reminder', async () => {
    const { processor, deliveryQueue } = buildProcessor({
      scannedConcerts: 1,
      recipients: 2,
      emailReminders: [
        { notificationId: 'notif-1', toEmail: 'a@ticketbox.test' },
        { notificationId: 'notif-2', toEmail: 'b@ticketbox.test' },
      ],
    });

    const result = await processor.process({ id: 'job-1' } as Job);

    expect(result).toEqual({ scannedConcerts: 1, recipients: 2, enqueued: 2 });
    expect(deliveryQueue.add).toHaveBeenCalledTimes(2);
    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'notification.deliver',
      { notificationId: 'notif-1', toEmail: 'a@ticketbox.test' },
      expect.objectContaining({ jobId: 'deliver-notif-1', attempts: 3 }),
    );
  });

  it('enqueues nothing when there are no email reminders (e.g. in-app only)', async () => {
    const { processor, deliveryQueue } = buildProcessor({
      scannedConcerts: 1,
      recipients: 0,
      emailReminders: [],
    });

    const result = await processor.process({ id: 'job-2' } as Job);

    expect(result.enqueued).toBe(0);
    expect(deliveryQueue.add).not.toHaveBeenCalled();
  });
});
