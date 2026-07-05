import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IEventPublisher } from '../../domain/ports/event-publisher.port';

@Injectable()
export class BullmqEventPublisher implements IEventPublisher {
  constructor(
    @InjectQueue('compute-seller-trust') private readonly trustQueue: Queue,
    @InjectQueue('resale.order.reserved.expiry') private readonly reservedExpiryQueue: Queue,
    @InjectQueue('resale.order.confirm.expiry') private readonly confirmExpiryQueue: Queue,
  ) {}

  async publish(eventName: string, payload: unknown, options?: any): Promise<void> {
    switch (eventName) {
      case 'compute-trust':
        await this.trustQueue.add('compute-trust', payload, options);
        break;
      case 'expire-reserved-order':
        await this.reservedExpiryQueue.add('expire-reserved-order', payload, options);
        break;
      case 'expire-confirm-order':
        await this.confirmExpiryQueue.add('expire-confirm-order', payload, options);
        break;
      default:
        throw new Error(`Unknown event name: ${eventName}`);
    }
  }
}
