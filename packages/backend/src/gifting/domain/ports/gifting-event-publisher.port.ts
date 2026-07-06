export const GIFTING_EVENT_PUBLISHER = 'GIFTING_EVENT_PUBLISHER';

export interface GiftInvitationEvent {
  transferId: string;
  senderName: string;
  recipientEmail: string;
  concertName: string;
  ticketType: string;
  token: string; // Plaintext token
  expiresAt: Date;
}

export interface GiftOutcomeEvent {
  transferId: string;
  senderId: string;
  recipientName: string;
  concertName: string;
  outcome: 'ACCEPTED' | 'DECLINED';
}

export interface IGiftingEventPublisher {
  publishGiftInvitation(event: GiftInvitationEvent): Promise<void>;
  publishGiftOutcome(event: GiftOutcomeEvent): Promise<void>;
}
