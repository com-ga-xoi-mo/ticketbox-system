import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTicketTypeDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceVnd?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  totalQuantity?: number;

  @IsDateString()
  @IsOptional()
  saleStartsAt?: string;

  @IsDateString()
  @IsOptional()
  saleEndsAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxPerUser?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
