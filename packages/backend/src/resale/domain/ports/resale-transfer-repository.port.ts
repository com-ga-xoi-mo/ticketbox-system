export const RESALE_TRANSFER_REPOSITORY = Symbol('RESALE_TRANSFER_REPOSITORY');

export interface IResaleTransferRepository {
  executePurchase(buyerId: string, listingId: string, newQrHash: string): Promise<any>;
}
