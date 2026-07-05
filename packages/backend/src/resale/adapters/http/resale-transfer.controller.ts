import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ExecutePurchaseUseCase } from '../../application/use-cases/execute-purchase.use-case';
import { JwtAuthGuard } from '../../../identity/auth.module';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';

@Controller('resale/purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResaleTransferController {
  constructor(private readonly executePurchaseUseCase: ExecutePurchaseUseCase) {}

  @Post()
  @Roles(Role.AUDIENCE)
  async executePurchase(@Req() req: any, @Body() body: { listingId: string }) {
    return this.executePurchaseUseCase.execute(req.user.userId, body.listingId);
  }
}
