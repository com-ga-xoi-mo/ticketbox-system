import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { TransitionOrderStatusUseCase } from '../../application/use-cases/transition-order-status.use-case';
import {
  InvalidOrderTransitionError,
  OrderConflictError,
  OrderNotFoundError,
} from '../../domain/errors';
import { TransitionOrderStatusDto } from './dto/transition-order-status.dto';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { serializeOrder } from './order-response.presenter';

@Controller('orders')
@UseGuards(InternalApiKeyGuard)
export class InternalOrderController {
  constructor(
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
  ) {}

  @Patch(':id/status')
  async transitionStatus(
    @Param('id') orderId: string,
    @Body() dto: TransitionOrderStatusDto,
  ) {
    try {
      const order = await this.transitionOrderStatusUseCase.execute({
        orderId,
        status: dto.status,
        skipOwnershipCheck: true,
      });
      return serializeOrder(order);
    } catch (err: unknown) {
      if (err instanceof OrderNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof InvalidOrderTransitionError) {
        throw new BadRequestException(err.message);
      }
      if (err instanceof OrderConflictError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
