import { Injectable, Inject } from '@nestjs/common';
import { ISellerBankProfileRepository, SellerBankProfile, SELLER_BANK_PROFILE_REPOSITORY } from '../../domain/ports/seller-bank-profile-repository.port';

@Injectable()
export class GetBankProfileQuery {
  constructor(
    @Inject(SELLER_BANK_PROFILE_REPOSITORY) private readonly repository: ISellerBankProfileRepository
  ) {}

  async execute(userId: string): Promise<SellerBankProfile | null> {
    return this.repository.findByUserId(userId);
  }
}
