export const SELLER_BANK_PROFILE_REPOSITORY = Symbol('SELLER_BANK_PROFILE_REPOSITORY');

export interface SellerBankProfile {
  userId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISellerBankProfileRepository {
  findByUserId(userId: string): Promise<SellerBankProfile | null>;
  upsert(userId: string, data: Omit<SellerBankProfile, 'userId' | 'createdAt' | 'updatedAt'>): Promise<SellerBankProfile>;
}
