import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaSellerBankProfileRepository } from '../../infrastructure/database/prisma-seller-bank-profile.repository';

export interface SaveBankProfileCommand {
  userId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

// Giả sử danh sách ngân hàng hợp lệ
const ALLOWED_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB',
  'VPBank',
  'ACB',
  'Sacombank',
  'TPBank',
  'VIB',
  'HDBank',
  'SeABank',
  'MSB',
  'LienVietPostBank',
  'OCB',
  'Nam A Bank',
  'Eximbank',
];

@Injectable()
export class SaveBankProfileUseCase {
  constructor(private readonly repository: PrismaSellerBankProfileRepository) {}

  async execute(command: SaveBankProfileCommand) {
    if (!ALLOWED_BANKS.includes(command.bankName)) {
      throw new BadRequestException('INVALID_BANK_NAME', 'Ngân hàng không hợp lệ');
    }

    if (!command.bankAccountName || !command.bankAccountNumber) {
      throw new BadRequestException('INVALID_BANK_INFO', 'Thông tin ngân hàng không được để trống');
    }

    return this.repository.upsert(command.userId, {
      bankAccountName: command.bankAccountName,
      bankAccountNumber: command.bankAccountNumber,
      bankName: command.bankName,
    });
  }
}
