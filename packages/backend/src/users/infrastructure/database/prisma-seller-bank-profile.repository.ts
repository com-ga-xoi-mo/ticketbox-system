import { PrismaClient } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { ISellerBankProfileRepository, SellerBankProfile } from '../../domain/ports/seller-bank-profile-repository.port';

@Injectable()
export class PrismaSellerBankProfileRepository implements ISellerBankProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<SellerBankProfile | null> {
    const profile = await this.prisma.sellerBankProfile.findUnique({
      where: { userId },
    });
    return profile ? profile as SellerBankProfile : null;
  }

  async upsert(userId: string, data: Omit<SellerBankProfile, 'userId' | 'createdAt' | 'updatedAt'>): Promise<SellerBankProfile> {
    const profile = await this.prisma.sellerBankProfile.upsert({
      where: { userId },
      update: {
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
      },
      create: {
        userId,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
      },
    });
    return profile as SellerBankProfile;
  }
}
