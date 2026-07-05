import { ResaleMessageThread, SendMessageResult, ResaleMessage } from '../resale-message.entity';

export const RESALE_MESSAGING_REPOSITORY = Symbol('RESALE_MESSAGING_REPOSITORY');

export interface IResaleMessagingRepository {
  sendMessage(userId: string, listingId: string, body: string, threadId?: string): Promise<SendMessageResult>;
  getMyThreads(userId: string): Promise<ResaleMessageThread[]>;
  getThreadMessages(userId: string, threadId: string): Promise<ResaleMessage[]>;
}
