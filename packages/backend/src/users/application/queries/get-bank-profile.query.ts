import { Injectable } from '@nestjs/common';
import { PrismaSellerBankProfileRepository, SellerBankProfileRecord } from '../../infrastructure/database/prisma-seller-bank-profile.repository';

@Injectable()
export class GetBankProfileQuery {
  constructor(private readonly repository: PrismaSellerBankProfileRepository) {}

  async execute(userId: string): Promise<SellerBankProfileRecord | null> {
    return this.repository.findByUserId(userId);
  }
}
