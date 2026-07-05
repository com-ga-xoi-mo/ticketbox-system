import { Module } from '@nestjs/common';
import { DatabaseModule } from '../platform/database/database.module';
import { SELLER_BANK_PROFILE_REPOSITORY } from './domain/ports/seller-bank-profile-repository.port';
import { PrismaSellerBankProfileRepository } from './infrastructure/database/prisma-seller-bank-profile.repository';
import { GetBankProfileQuery } from './application/queries/get-bank-profile.query';
import { SaveBankProfileUseCase } from './application/use-cases/save-bank-profile.use-case';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SELLER_BANK_PROFILE_REPOSITORY,
      useClass: PrismaSellerBankProfileRepository,
    },
    GetBankProfileQuery,
    SaveBankProfileUseCase,
  ],
  exports: [
    SELLER_BANK_PROFILE_REPOSITORY,
    GetBankProfileQuery,
    SaveBankProfileUseCase,
  ],
})
export class UsersModule {}
