import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, GoneException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../../identity/adapters/http/guards/roles.guard';
import { InitiateP2POrderUseCase } from '../../../application/use-cases/p2p-order/initiate-p2p-order.use-case';
import { ConfirmPaymentUseCase } from '../../../application/use-cases/p2p-order/confirm-payment.use-case';
import { ConfirmReceiptUseCase } from '../../../application/use-cases/p2p-order/confirm-receipt.use-case';
import { CancelP2POrderUseCase } from '../../../application/use-cases/p2p-order/cancel-p2p-order.use-case';
import { RaiseDisputeUseCase } from '../../../application/use-cases/p2p-order/raise-dispute.use-case';
import { GetP2POrderUseCase } from '../../../application/use-cases/p2p-order/get-p2p-order.use-case';
import type { AuthenticatedUser } from '../../../../identity/domain/authenticated-user.interface';

import { InitiateOrderDto, ConfirmPaymentDto, RaiseDisputeDto } from '../dto/p2p-order.dto';

@Controller('resale')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResaleOrderController {
  constructor(
    private readonly initiateP2POrderUseCase: InitiateP2POrderUseCase,
    private readonly confirmPaymentUseCase: ConfirmPaymentUseCase,
    private readonly confirmReceiptUseCase: ConfirmReceiptUseCase,
    private readonly cancelP2POrderUseCase: CancelP2POrderUseCase,
    private readonly raiseDisputeUseCase: RaiseDisputeUseCase,
    private readonly getP2POrderUseCase: GetP2POrderUseCase,
  ) {}

  @Post('purchase')
  @HttpCode(410)
  async purchaseDeprecated() {
    throw new GoneException('Endpoint deprecated. Use /resale/purchase/initiate instead.');
  }

  @Post('purchase/initiate')
  @HttpCode(201)
  async initiateOrder(
    @Request() req: { user: AuthenticatedUser },
    @Body() body: InitiateOrderDto
  ) {
    return this.initiateP2POrderUseCase.execute({
      buyerId: req.user.id,
      listingId: body.listingId
    });
  }

  @Post('orders/:id/confirm-payment')
  @HttpCode(200)
  async confirmPayment(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: ConfirmPaymentDto
  ) {
    return this.confirmPaymentUseCase.execute({
      orderId: id,
      buyerId: req.user.id,
      paymentProofUrl: body.paymentProofUrl
    });
  }

  @Post('orders/:id/confirm-receipt')
  @HttpCode(200)
  async confirmReceipt(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string
  ) {
    return this.confirmReceiptUseCase.execute({
      orderId: id,
      sellerId: req.user.id
    });
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  async cancelOrder(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string
  ) {
    return this.cancelP2POrderUseCase.execute({
      orderId: id,
      userId: req.user.id
    });
  }

  @Post('orders/:id/dispute')
  @HttpCode(200)
  async raiseDispute(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: RaiseDisputeDto
  ) {
    return this.raiseDisputeUseCase.execute({
      orderId: id,
      userId: req.user.id,
      reason: body.reason
    });
  }

  @Get('orders/:id')
  async getOrder(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string
  ) {
    return this.getP2POrderUseCase.execute({
      orderId: id,
      userId: req.user.id
    });
  }
}
