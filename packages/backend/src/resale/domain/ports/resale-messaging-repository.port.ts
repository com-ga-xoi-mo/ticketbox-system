export const RESALE_MESSAGING_REPOSITORY = Symbol('RESALE_MESSAGING_REPOSITORY');

export interface IResaleMessagingRepository {
  sendMessage(userId: string, listingId: string, body: string, threadId?: string): Promise<{ message: any; thread: any; isFirstSellerReply: boolean; listing: any }>;
  getMyThreads(userId: string): Promise<any[]>;
  getThreadMessages(userId: string, threadId: string): Promise<any[]>;
}
