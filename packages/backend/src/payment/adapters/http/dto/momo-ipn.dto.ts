import { IsNumber, IsOptional, IsString } from 'class-validator';

export class MomoIpnDto {
  @IsString()
  partnerCode!: string;

  @IsString()
  orderId!: string;

  @IsString()
  requestId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  orderInfo?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  transId?: number | string;

  @IsNumber()
  resultCode!: number;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsNumber()
  responseTime!: number;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsString()
  signature!: string;
}
