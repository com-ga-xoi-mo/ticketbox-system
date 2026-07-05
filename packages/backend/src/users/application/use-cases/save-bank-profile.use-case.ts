import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ISellerBankProfileRepository, SELLER_BANK_PROFILE_REPOSITORY } from '../../domain/ports/seller-bank-profile-repository.port';

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
  constructor(
    @Inject(SELLER_BANK_PROFILE_REPOSITORY) private readonly repository: ISellerBankProfileRepository
  ) {}

  async execute(command: SaveBankProfileCommand) {
    if (!ALLOWED_BANKS.includes(command.bankName)) {
      throw new BadRequestException('Ngân hàng không hợp lệ', { cause: new Error(), description: 'INVALID_BANK_NAME' });
    }

    if (!command.bankAccountName || !command.bankAccountNumber) {
      throw new BadRequestException('Thông tin ngân hàng không được để trống', { cause: new Error(), description: 'INVALID_BANK_INFO' });
    }

    return this.repository.upsert(command.userId, {
      bankAccountName: command.bankAccountName,
      bankAccountNumber: command.bankAccountNumber,
      bankName: command.bankName,
    });
  }
}
