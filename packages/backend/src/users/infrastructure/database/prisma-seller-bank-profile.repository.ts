import { PrismaClient } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';

export interface SellerBankProfileData {
  userId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

export interface SellerBankProfileRecord {
  id: string;
  userId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaSellerBankProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<SellerBankProfileRecord | null> {
    return this.prisma.sellerBankProfile.findUnique({
      where: { userId },
    });
  }

  async upsert(userId: string, data: Omit<SellerBankProfileData, 'userId'>): Promise<SellerBankProfileRecord> {
    return this.prisma.sellerBankProfile.upsert({
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
  }
}
