import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { GetMyTransactionsUseCase, ProcessPayoutUseCase } from '../../application/use-cases/transaction.use-cases';
import { JwtAuthGuard } from '../../../identity/auth.module';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResaleTransactionController {
  constructor(
    private readonly getMyTransactionsUseCase: GetMyTransactionsUseCase,
    private readonly processPayoutUseCase: ProcessPayoutUseCase
  ) {}

  @Get('me/resale/transactions')
  @Roles(Role.AUDIENCE)
  async getMyTransactions(@Req() req: any) {
    return this.getMyTransactionsUseCase.execute(req.user.id);
  }

  @Patch('admin/resale/transactions/:id/payout')
  @Roles(Role.ADMIN)
  async processPayout(@Param('id') id: string) {
    return this.processPayoutUseCase.execute(id);
  }
}
