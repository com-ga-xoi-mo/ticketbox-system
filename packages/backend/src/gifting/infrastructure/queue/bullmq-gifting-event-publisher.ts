import { Injectable, Logger } from '@nestjs/common';
import {
  IGiftingEventPublisher,
  GiftInvitationEvent,
  GiftOutcomeEvent,
} from '../../domain/ports/gifting-event-publisher.port';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class BullMQGiftingEventPublisher implements IGiftingEventPublisher {
  private readonly logger = new Logger(BullMQGiftingEventPublisher.name);

  constructor(@InjectQueue('notifications') private readonly notificationQueue: Queue) {}

  async publishGiftInvitation(event: GiftInvitationEvent): Promise<void> {
    this.logger.log(`Publishing GiftInvitationEvent for transfer ${event.transferId}`);
    // Tasks 6.1: Queueing job for notification worker to handle the template
    await this.notificationQueue.add('gift-invitation', event);
  }

  async publishGiftOutcome(event: GiftOutcomeEvent): Promise<void> {
    this.logger.log(
      `Publishing GiftOutcomeEvent for transfer ${event.transferId} (Outcome: ${event.outcome})`,
    );
    // Tasks 6.2, 6.3, 7.1, 7.2: Queueing job for notification worker
    await this.notificationQueue.add('gift-outcome', event);
  }
}
