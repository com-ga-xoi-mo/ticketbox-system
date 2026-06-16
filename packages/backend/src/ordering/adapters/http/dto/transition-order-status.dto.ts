import { IsEnum } from 'class-validator';

import { OrderStatus } from '../../../domain/order-status.enum';

export class TransitionOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
