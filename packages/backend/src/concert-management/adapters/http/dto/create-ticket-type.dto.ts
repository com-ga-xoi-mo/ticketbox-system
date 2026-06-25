import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  priceVnd!: number;

  @IsInt()
  @Min(1)
  totalQuantity!: number;

  @IsDateString()
  saleStartsAt!: string;

  @IsDateString()
  saleEndsAt!: string;

  @IsInt()
  @Min(1)
  maxPerUser!: number;
}
