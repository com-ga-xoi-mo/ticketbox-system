import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaymentProvider } from '../../../domain/payment-provider.enum';

export class InitiatePaymentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  idempotencyKey!: string;

  @IsOptional()
  @IsIn([PaymentProvider.SIMULATOR, PaymentProvider.MOMO, PaymentProvider.VNPAY])
  provider?: PaymentProvider;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}
