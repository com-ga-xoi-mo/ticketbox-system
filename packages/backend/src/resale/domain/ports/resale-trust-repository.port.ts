export const RESALE_TRUST_REPOSITORY = Symbol('RESALE_TRUST_REPOSITORY');

export interface IResaleTrustRepository {
  getSellerProfile(userId: string): Promise<any>;
  computeTrustScore(sellerId: string): Promise<void>;
}
