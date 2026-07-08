export const WAITLIST_RELEASE_PUBLISHER = Symbol('WaitlistReleasePublisher');

export interface ReleasedPrimarySaleItem {
  ticketTypeId: string;
  quantityReleased: number;
}

export interface WaitlistReleasePublisherPort {
  publishPrimarySaleRelease(items: ReleasedPrimarySaleItem[]): Promise<void>;
}
