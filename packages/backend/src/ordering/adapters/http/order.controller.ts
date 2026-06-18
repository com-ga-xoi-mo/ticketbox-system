import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { ListUserOrdersUseCase } from '../../application/use-cases/list-user-orders.use-case';
import {
  InsufficientTicketInventoryError,
  InventoryReservationConflictError,
  OrderNotFoundError,
  TicketTypeInactiveError,
  TicketTypeNotFoundError,
  TicketTypeSaleWindowError,
} from '../../domain/errors';
import { CreateOrderDto } from './dto/create-order.dto';
import { serializeOrder } from './order-response.presenter';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listUserOrdersUseCase: ListUserOrdersUseCase,
  ) {}

  @Post('checkout/orders')
  @Roles(Role.AUDIENCE)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const order = await this.createOrderUseCase.execute({
        userId: req.user.id,
        concertId: dto.concertId,
        idempotencyKey: dto.idempotencyKey,
        items: dto.items.map((item) => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
        })),
      });

      return serializeOrder(order);
    } catch (err: unknown) {
      if (err instanceof TicketTypeNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof TicketTypeInactiveError ||
        err instanceof TicketTypeSaleWindowError
      ) {
        throw new BadRequestException(err.message);
      }
      if (
        err instanceof InsufficientTicketInventoryError ||
        err instanceof InventoryReservationConflictError
      ) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @Get('me/orders')
  @Roles(Role.AUDIENCE)
  async listMyOrders(@Request() req: { user: AuthenticatedUser }) {
    const orders = await this.listUserOrdersUseCase.execute({ userId: req.user.id });
    return orders.map((order) => serializeOrder(order));
  }

  @Get('me/orders/:id')
  @Roles(Role.AUDIENCE)
  async getMyOrder(
    @Param('id') orderId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const order = await this.getOrderUseCase.execute({
        userId: req.user.id,
        orderId,
      });

      return serializeOrder(order);
    } catch (err: unknown) {
      if (err instanceof OrderNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
