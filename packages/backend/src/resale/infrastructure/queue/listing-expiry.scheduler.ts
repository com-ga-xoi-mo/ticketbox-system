import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ResaleListingExpiryScheduler implements OnModuleInit {
  constructor(@InjectQueue('resale-listing-expiry') private expiryQueue: Queue) {}

  async onModuleInit() {
    await this.expiryQueue.add('check-expiry', {}, {
      repeat: {
        pattern: '*/15 * * * *', // every 15 minutes
      }
    });
  }
}
