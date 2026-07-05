export interface ResaleMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}

export interface ResaleMessageThread {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  isClosed: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  listing?: any;
  messages?: ResaleMessage[];
  _count?: {
    messages: number;
  };
}

export interface SendMessageResult {
  message: ResaleMessage;
  thread: ResaleMessageThread;
  isFirstSellerReply: boolean;
  listing: any;
}
