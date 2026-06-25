import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import {
  CONCERT_REMINDER_SCAN_INTERVAL_MS,
  SendConcertRemindersUseCase,
} from '../../../application/use-cases/send-concert-reminders.use-case';
import {
  NOTIFICATION_CONCERT_REMINDER_QUEUE,
  NOTIFICATION_CONCERT_REMINDER_SCAN_JOB,
  NOTIFICATION_DELIVERY_JOB,
  NOTIFICATION_DELIVERY_QUEUE,
} from '../../../../platform/queue/platform-queue.constants';
import { PlatformConfigService } from '../../../../platform/config/platform-config.service';
import type { NotificationDeliveryJobData } from '../../../infrastructure/queue/notification-job.types';

@Processor(NOTIFICATION_CONCERT_REMINDER_QUEUE)
export class ConcertReminderProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ConcertReminderProcessor.name);

  constructor(
    private readonly sendConcertReminders: SendConcertRemindersUseCase,
    private readonly config: PlatformConfigService,
    @InjectQueue(NOTIFICATION_CONCERT_REMINDER_QUEUE)
    private readonly scanQueue: Queue,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.scanQueue.add(
      NOTIFICATION_CONCERT_REMINDER_SCAN_JOB,
      {},
      {
        jobId: NOTIFICATION_CONCERT_REMINDER_SCAN_JOB,
        repeat: { every: CONCERT_REMINDER_SCAN_INTERVAL_MS },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(
    job: Job,
  ): Promise<{ scannedConcerts: number; recipients: number; enqueued: number }> {
    const result = await this.sendConcertReminders.execute();

    for (const reminder of result.emailReminders) {
      await this.deliveryQueue.add(
        NOTIFICATION_DELIVERY_JOB,
        {
          notificationId: reminder.notificationId,
          toEmail: reminder.toEmail,
        },
        {
          jobId: `deliver-${reminder.notificationId}`,
          attempts: this.config.emailMaxAttempts,
          backoff: {
            type: 'fixed',
            delay: this.config.emailRetryBackoffMs,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    this.logger.debug(
      `Concert reminder scan completed by job ${job.id}: scannedConcerts=${result.scannedConcerts}, recipients=${result.recipients}, enqueued=${result.emailReminders.length}`,
    );

    return {
      scannedConcerts: result.scannedConcerts,
      recipients: result.recipients,
      enqueued: result.emailReminders.length,
    };
  }
}
