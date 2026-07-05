export interface ResaleTrustProfile {
  userId: string;
  displayName: string;
  memberSince: Date;
  tier: 'NEW' | 'TRUSTED' | 'HIGHLY_TRUSTED' | 'TOP_SELLER';
  completedSalesCount: number;
  activeListings: any[];
}
