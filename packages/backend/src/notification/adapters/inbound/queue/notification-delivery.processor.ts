import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { DeliverNotificationUseCase } from '../../../application/use-cases/deliver-notification.use-case';
import { NOTIFICATION_DELIVERY_QUEUE } from '../../../../platform/queue/platform-queue.constants';
import type { NotificationDeliveryJobData } from '../../../infrastructure/queue/notification-job.types';

@Processor(NOTIFICATION_DELIVERY_QUEUE)
export class NotificationDeliveryProcessor extends WorkerHost {
  constructor(private readonly deliverNotification: DeliverNotificationUseCase) {
    super();
  }

  async process(job: Job<NotificationDeliveryJobData>): Promise<{ status: string }> {
    const outcome = await this.deliverNotification.execute(
      job.data.notificationId,
      job.data.toEmail,
      { orderId: job.data.orderId },
    );

    if (outcome.shouldRetry) {
      throw new Error('Email delivery failed and should be retried');
    }

    return { status: outcome.status };
  }
}
