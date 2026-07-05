import { Injectable, Inject } from '@nestjs/common';
import { IResaleMessagingRepository, RESALE_MESSAGING_REPOSITORY } from '../../domain/ports/resale-messaging-repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../domain/ports/event-publisher.port';

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(RESALE_MESSAGING_REPOSITORY) private readonly messagingRepo: IResaleMessagingRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject('GATEWAY_SENDER') private readonly gatewaySender: any
  ) {}

  async execute(userId: string, listingId: string, body: string, threadId?: string) {
    const res = await this.messagingRepo.sendMessage(userId, listingId, body, threadId);
    
    const recipientId = res.thread.buyerId === userId ? res.thread.sellerId : res.thread.buyerId;
    this.gatewaySender(recipientId, {
      threadId: res.thread.id,
      messageId: res.message.id,
      senderId: userId,
      body: res.message.body,
      createdAt: res.message.createdAt
    });

    if (res.isFirstSellerReply) {
      await this.eventPublisher.publish('compute-trust', { sellerId: res.listing.sellerId });
    }

    return res.message;
  }
}

@Injectable()
export class GetMyThreadsUseCase {
  constructor(@Inject(RESALE_MESSAGING_REPOSITORY) private readonly messagingRepo: IResaleMessagingRepository) {}
  async execute(userId: string) {
    return this.messagingRepo.getMyThreads(userId);
  }
}

@Injectable()
export class GetThreadMessagesUseCase {
  constructor(@Inject(RESALE_MESSAGING_REPOSITORY) private readonly messagingRepo: IResaleMessagingRepository) {}
  async execute(userId: string, threadId: string) {
    return this.messagingRepo.getThreadMessages(userId, threadId);
  }
}
