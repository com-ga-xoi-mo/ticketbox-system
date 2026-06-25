import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  NOTIFICATION_PURCHASE_CONFIRMATION_JOB,
  NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE,
} from '../../../platform/queue/platform-queue.constants';
import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';
import type { PurchaseConfirmationQueuePort } from '../../domain/ports/purchase-confirmation-queue.port';
import type { PurchaseConfirmationJobData } from './notification-job.types';

@Injectable()
export class PurchaseConfirmationNotificationProducer
  implements PurchaseConfirmationQueuePort
{
  constructor(
    @InjectQueue(NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE)
    private readonly queue: Queue<PurchaseConfirmationJobData>,
  ) {}

  async enqueueOrderPaid(event: OrderPaidForNotification): Promise<void> {
    await this.queue.add(NOTIFICATION_PURCHASE_CONFIRMATION_JOB, event, {
      jobId: `order-paid-${event.eventId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
