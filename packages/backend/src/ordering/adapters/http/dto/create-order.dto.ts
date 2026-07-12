import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  ticketTypeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  concertId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  idempotencyKey!: string;

  @IsString()
  @IsOptional()
  promoCode?: string;

  @IsUUID()
  @IsOptional()
  waitlistEntitlementId?: string;

  @IsString()
  @IsOptional()
  waitingRoomAdmissionToken?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
