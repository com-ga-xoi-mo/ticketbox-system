import { Controller, Post, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { ResolveDisputeUseCase } from '../../application/use-cases/p2p-order/resolve-dispute.use-case';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';

@Controller('admin/resale')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminResaleOrderController {
  constructor(
    private readonly resolveDisputeUseCase: ResolveDisputeUseCase,
  ) {}

  @Post('orders/:id/resolve')
  @HttpCode(200)
  async resolveDispute(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: { action: 'complete' | 'cancel'; resolutionNote: string }
  ) {
    return this.resolveDisputeUseCase.execute({
      orderId: id,
      adminId: req.user.id,
      action: body.action,
      resolutionNote: body.resolutionNote
    });
  }
}
