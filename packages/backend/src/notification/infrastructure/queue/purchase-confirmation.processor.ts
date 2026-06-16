import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { CreatePurchaseConfirmationNotificationsUseCase } from '../../application/use-cases/create-purchase-confirmation-notifications.use-case';
import {
  NOTIFICATION_DELIVERY_JOB,
  NOTIFICATION_DELIVERY_QUEUE,
  NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE,
} from '../../../platform/queue/platform-queue.constants';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type {
  NotificationDeliveryJobData,
  PurchaseConfirmationJobData,
} from './notification-job.types';

@Processor(NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE)
export class PurchaseConfirmationProcessor extends WorkerHost {
  constructor(
    private readonly createPurchaseConfirmation: CreatePurchaseConfirmationNotificationsUseCase,
    private readonly config: PlatformConfigService,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
  ) {
    super();
  }

  async process(job: Job<PurchaseConfirmationJobData>): Promise<{ emailNotificationId: string }> {
    const notifications = await this.createPurchaseConfirmation.execute(job.data);

    await this.deliveryQueue.add(
      NOTIFICATION_DELIVERY_JOB,
      {
        notificationId: notifications.email.id,
        toEmail: job.data.userEmail,
      },
      {
        jobId: `deliver-${notifications.email.id}`,
        attempts: this.config.emailMaxAttempts,
        backoff: {
          type: 'fixed',
          delay: this.config.emailRetryBackoffMs,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { emailNotificationId: notifications.email.id };
  }
}
