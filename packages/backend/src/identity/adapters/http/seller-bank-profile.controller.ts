import { Controller, Get, Put, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GetBankProfileQuery } from '../../../users/application/queries/get-bank-profile.query';
import { SaveBankProfileUseCase } from '../../../users/application/use-cases/save-bank-profile.use-case';
import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';

export class SaveBankProfileDto {
  bankAccountName!: string;
  bankAccountNumber!: string;
  bankName!: string;
}

@Controller('me/bank-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellerBankProfileController {
  constructor(
    private readonly getBankProfileQuery: GetBankProfileQuery,
    private readonly saveBankProfileUseCase: SaveBankProfileUseCase,
  ) {}

  @Get()
  async getBankProfile(@Request() req: { user: AuthenticatedUser }) {
    const profile = await this.getBankProfileQuery.execute(req.user.id);
    return profile || null;
  }

  @Put()
  @HttpCode(200)
  async saveBankProfile(
    @Request() req: { user: AuthenticatedUser },
    @Body() dto: SaveBankProfileDto,
  ) {
    const saved = await this.saveBankProfileUseCase.execute({
      userId: req.user.id,
      bankAccountName: dto.bankAccountName,
      bankAccountNumber: dto.bankAccountNumber,
      bankName: dto.bankName,
    });
    return saved;
  }
}
