import { ResaleTrustProfile } from '../resale-trust.entity';

export const RESALE_TRUST_REPOSITORY = Symbol('RESALE_TRUST_REPOSITORY');

export interface IResaleTrustRepository {
  getSellerProfile(userId: string): Promise<ResaleTrustProfile | null>;
  computeTrustScore(sellerId: string, event?: string): Promise<void>;
}
