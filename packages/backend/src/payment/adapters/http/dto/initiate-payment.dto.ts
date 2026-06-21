import { IsIn, IsOptional } from 'class-validator';

import { PaymentProvider } from '../../../domain/payment-provider.enum';

export class InitiatePaymentDto {
  @IsOptional()
  @IsIn([PaymentProvider.SIMULATOR, PaymentProvider.MOMO])
  provider?: PaymentProvider;
}
